# Size to Weight Calculator (Rectangular Box)

Research date: 20 November 2026. This is the next missing item in the user's attachment after Daily Light Integral and the existing intervening direct routes. The directory card identifies it as a construction calculator but does not specify material or whether the object is hollow.

## Implemented interpretation

Provide a bounded **solid rectangular cuboid** mass estimator. User enters three positive dimensions in one selected length unit and a positive material density in kg/m³. Convert the dimensions to metres, calculate `volume = length × width × height`, then `mass = volume × density`. Show the result as mass in kilograms and the gravitational-force equivalent in newtons using standard gravity `g₀ = 9.80665 m/s²`. Do not include material-density presets, since density varies by material grade, composition, moisture, and temperature. Do not imply the equation applies to a hollow enclosure, sheet-metal box, shipping box, or a shape with cavities; those require wall thickness, profile, joints, and other geometry.

Worked example: a solid 1.0 m × 0.5 m × 0.2 m block with user-entered density 500 kg/m³ has volume 0.1 m³, mass 50 kg, and weight force about 490.33 N.

## Sources

OpenStax/LibreTexts defines density as mass divided by volume, gives SI density in kg/m³, and demonstrates calculating a solid cube's volume from its dimensions: [Volume, Thickness, and Density](https://chem.libretexts.org/Courses/Oregon_Institute_of_Technology/OIT%3A_CHE_101_-_Introduction_to_General_Chemistry/01%3A_Making_Measurements/1.04%3A_Volume_Thickness_and_Density).

MatWeb's engineering-shape weight tool asks users to select a shape and material or enter a density, then supply the appropriate dimensions; it reports weight in metric and common U.S. units: [Engineering Shapes Weight Calculator](https://www.matweb.com/tools/weightcalculator.aspx).

These sources support user-supplied density and geometry-specific calculations, not a built-in universal material density or a hollow box assumption.
