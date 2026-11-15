(()=>{'use strict';
function init(){
 const fileInput=document.getElementById('imageFile');if(!fileInput)return;
 const widthInput=document.getElementById('imageWidth'),heightInput=document.getElementById('imageHeight'),formatInput=document.getElementById('imageFormat'),qualityInput=document.getElementById('imageQuality'),ratioInput=document.getElementById('keepRatio');
 const resizeButton=document.getElementById('resizeImage'),resetButton=document.getElementById('resetImage'),download=document.getElementById('downloadImage'),status=document.getElementById('imageStatus'),sourceInfo=document.getElementById('sourceInfo');
 const originalPreview=document.getElementById('originalPreview'),outputPreview=document.getElementById('outputPreview'),originalCaption=document.getElementById('originalCaption'),outputCaption=document.getElementById('outputCaption');
 const maxFileBytes=20*1024*1024,maxSide=6000,maxPixels=20000000;
 let sourceFile=null,sourceUrl=null,outputUrl=null,sourceImage=null,ratio=1;
 const setStatus=(message,error=false)=>{status.textContent=message;status.className=error?'image-status image-error':'image-status';};
 const revoke=url=>{if(url)URL.revokeObjectURL(url);};
 const resetOutput=()=>{revoke(outputUrl);outputUrl=null;outputPreview.removeAttribute('src');outputPreview.hidden=true;download.hidden=true;outputCaption.textContent='Resized image';};
 function setEnabled(enabled){[widthInput,heightInput,formatInput,qualityInput,ratioInput,resizeButton].forEach(el=>el.disabled=!enabled);}
 function dimension(value){const n=Number(value);if(!Number.isInteger(n)||n<1||n>maxSide)throw new Error('Enter a whole-number dimension between 1 and '+maxSide+' pixels.');return n;}
 function validateDimensions(w,h){if(w*h>maxPixels)throw new Error('The output is larger than 40 megapixels. Reduce the width or height.');}
 function loadFile(file){
  resetOutput();sourceFile=file;sourceImage=null;revoke(sourceUrl);sourceUrl=null;
  originalPreview.removeAttribute('src');originalPreview.hidden=true;originalCaption.textContent='Original image';
  if(!file){setEnabled(false);sourceInfo.textContent='No image selected.';return;}
  if(!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type)){setEnabled(false);setStatus('Choose a PNG, JPG, WebP or GIF image. SVG and other formats are not supported.',true);return;}
  if(file.size>maxFileBytes){setEnabled(false);setStatus('The selected image exceeds the 20 MB input limit.',true);return;}
  sourceUrl=URL.createObjectURL(file);
  const image=new Image();
  image.onload=()=>{
   if(image.naturalWidth*image.naturalHeight>maxPixels){setEnabled(false);setStatus('The source image exceeds 20 megapixels. Choose a smaller image.',true);return;}
   sourceImage=image;ratio=image.naturalWidth/image.naturalHeight;
   const scale=Math.min(1,maxSide/image.naturalWidth,maxSide/image.naturalHeight,Math.sqrt(maxPixels/(image.naturalWidth*image.naturalHeight)));
   widthInput.value=String(Math.max(1,Math.round(image.naturalWidth*scale)));
   heightInput.value=String(Math.max(1,Math.round(image.naturalHeight*scale)));
   setEnabled(true);qualityInput.disabled=formatInput.value==='image/png';originalPreview.src=sourceUrl;originalPreview.hidden=false;
   originalCaption.textContent='Original: '+image.naturalWidth+' × '+image.naturalHeight+' px';
   sourceInfo.textContent=(file.size/1024/1024).toFixed(2)+' MB · '+file.type;
   setStatus('Image loaded. Choose dimensions and output format.');
  };
  image.onerror=()=>{setEnabled(false);setStatus('The browser could not decode this image. Try another raster image.',true);};
  image.src=sourceUrl;
 }
 function updateRatio(changed){
  if(!ratioInput.checked||!sourceImage)return;
  const w=Number(widthInput.value),h=Number(heightInput.value);
  if(changed==='width'&&Number.isFinite(w)&&w>0)heightInput.value=String(Math.max(1,Math.round(w/ratio)));
  if(changed==='height'&&Number.isFinite(h)&&h>0)widthInput.value=String(Math.max(1,Math.round(h*ratio)));
 }
 async function resize(){
  try{
   if(!sourceImage||!sourceFile)throw new Error('Choose an image first.');
   const width=dimension(widthInput.value),height=dimension(heightInput.value);validateDimensions(width,height);
   const mime=formatInput.value,quality=Number(qualityInput.value);
   const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
   const ctx=canvas.getContext('2d',{alpha:mime!=='image/jpeg'});
   if(!ctx)throw new Error('Canvas processing is not available in this browser.');
   if(mime==='image/jpeg'){ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);}
   ctx.drawImage(sourceImage,0,0,width,height);
   const blob=await new Promise((resolve,reject)=>canvas.toBlob(result=>result?resolve(result):reject(new Error('The browser could not encode this image format.')),mime,mime==='image/png'?undefined:quality));
   if(blob.type!==mime)throw new Error('This browser does not support the selected output format. Choose PNG, JPEG or WebP supported by your browser.');
   resetOutput();outputUrl=URL.createObjectURL(blob);outputPreview.src=outputUrl;outputPreview.hidden=false;
   const extension=mime==='image/jpeg'?'jpg':mime==='image/png'?'png':'webp';
   const base=(sourceFile.name.replace(/\.[^.]+$/,'')||'image').replace(/[^a-z0-9_-]+/gi,'-');
   download.href=outputUrl;download.download=base+'-resized.'+extension;download.hidden=false;
   outputCaption.textContent='Output: '+width+' × '+height+' px · '+(blob.size/1024).toFixed(1)+' KB · '+extension.toUpperCase();
   setStatus('Image ready. Select Download image to save the processed file.');
  }catch(error){setStatus(String(error.message||'Image processing failed.'),true);}
 }
 function reset(){
  fileInput.value='';sourceFile=null;sourceImage=null;revoke(sourceUrl);sourceUrl=null;resetOutput();setEnabled(false);
  originalPreview.removeAttribute('src');originalPreview.hidden=true;originalCaption.textContent='Original image';outputCaption.textContent='Resized image';sourceInfo.textContent='No image selected.';setStatus('');
 }
 fileInput.addEventListener('change',()=>loadFile(fileInput.files&&fileInput.files[0]));
 widthInput.addEventListener('input',()=>updateRatio('width'));heightInput.addEventListener('input',()=>updateRatio('height'));
 formatInput.addEventListener('change',()=>{qualityInput.disabled=formatInput.value==='image/png'||!sourceImage;});
 resizeButton.addEventListener('click',resize);resetButton.addEventListener('click',reset);
 window.addEventListener('pagehide',()=>{revoke(sourceUrl);revoke(outputUrl);},{once:true});
}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();}
})();