# Calculator batch 2: formula notes and disposition

Research date: 18 November 2026. This batch follows the user’s catalog order after Cricket Chirping Thermometer. Existing Horse Weight, Rabbit Cage Size, Rat Cage, Animal Mortality Rate, Cattle per Acre, and Grain Bin pages were skipped.

## Implemented

### Dry Matter Calculator

Scope is explicitly limited to an animal-feed or forage sample. Dry matter (%) = net dried sample mass ÷ net original as-fed sample mass × 100; moisture by difference (%) = 100 − dry matter (%). Both masses must use the same unit, be net of container/tare, and dried mass cannot exceed original mass. The interface describes moisture by difference as arithmetic, not a direct water measurement.

University of Georgia Extension documents feed sample dry-matter testing, tare-weight correction, and errors such as sample loss or incomplete drying: [Measuring the Dry Matter Content of Feeds](https://fieldreport.caes.uga.edu/publications/SB58/measuring-the-dry-matter-content-of-feeds/). Nebraska Extension distinguishes as-fed and dry-matter bases: [Feed Dry Matter Conversions](https://extensionpubs.unl.edu/publication/g2093/2023/html/view). AAFCO cautions that loss-on-drying can include volatile compounds other than water: [Recommendations and Critical Factors in Determining Moisture in Animal Feeds](https://www.aafco.org/wp-content/uploads/2023/01/Moisture_paper_final.pdf).

Worked example: 100 g net as-fed and 40 g net dried gives 40% dry matter and 60% moisture by difference. This is not a ration, nutrient conversion, feeding amount, or recommendation.

### Feed Conversion Ratio Calculator

Scope is a descriptive ratio for the same animal or defined group over the same period: FCR = total feed mass consumed ÷ positive liveweight gain, where liveweight gain = ending mass − starting mass. The input explicitly identifies the feed basis as as-fed or dry matter; no target values are supplied. Zero or negative gain is reported as undefined for conventional positive-gain FCR.

[Utah State University Extension](https://extension.usu.edu/4h-livestock-calculator/research/market-animal-feed-efficiency-a-tool-for-evaluating-feed-conversion) and a [peer-reviewed beef-production study](https://pmc.ncbi.nlm.nih.gov/articles/PMC10223015/) support the feed-per-unit-gain ratio. [FAO aquaculture guidance](https://www.fao.org/4/y3781e/y3781e05.htm) illustrates that feed basis and production conventions differ, supporting the page’s explicit basis and comparability cautions. The calculator does not adjust for mortality, feed wastage, natural feed, or measurement variation and must not be read as a cross-species benchmark or husbandry recommendation.

Worked example: 10 kg as-fed feed with a 5 kg liveweight gain yields 2 kg as-fed feed/kg liveweight gain.

## Deferred

- **Guinea Pig Years to Human Years:** Merck Veterinary Manual and a 2025 peer-reviewed guinea-pig survival study provide lifespan/survival estimates, not a validated individual age-equivalence formula. A lifespan ratio would imply unsupported precision. Sources: [Merck Veterinary Manual](https://www.merckvetmanual.com/all-other-pets/guinea-pigs/description-and-physical-characteristics-of-guinea-pigs), [Cavy lifespan survival analysis](https://pmc.ncbi.nlm.nih.gov/articles/PMC12278940/).
- **Hamster Age Calculator:** The title is ambiguous, and reviewed veterinary and primary sources report cohort/lab-population lifespans but do not validate a general hamster-to-human age conversion. A chronological-age utility would require clarified scope rather than a silently substituted feature. Sources: [Royal Veterinary College summary](https://www.rvc.ac.uk/vetcompass/news/largest-study-reveals-most-common-disorders-and-lifespan-of-pet-hamsters-in-the-uk), [peer-reviewed LVG Syrian hamster study](https://pubmed.ncbi.nlm.nih.gov/2257890/), [RSPCA hamster guidance](https://www.rspca.org.uk/adviceandwelfare/pets/rodents/hamsters).
- **Rabbit Color Calculator:** Rabbit coat color involves multiple interacting loci and unresolved/incomplete genotype-to-phenotype evidence. A breeding predictor would need an explicit locus set, allele nomenclature, and assumptions not defined by the catalog title. Sources: [Oregon State University Extension summary](https://extension.oregonstate.edu/catalog/em-9708-rabbit-coat-color-genetics-summary-table), [Oregon State University Extension article](https://extension.oregonstate.edu/catalog/understanding-genetics-behind-rabbit-coat-colors-part-2-coat-color-genes), [peer-reviewed rabbit genetic-resources review](https://doi.org/10.3390/app11010373).
- **Turtle Tank Size Calculator:** The title covers terrestrial and aquatic species, while available aquatic-turtle guidance offers scoped rules of thumb and species-specific dimensions rather than a universal minimum. A general answer could be unsafe. Sources: [PetMD Aquatic Turtle Care Sheet](https://www.petmd.com/reptile/aquatic-turtle-care-sheet), [Lafeber veterinary turtle-care handout](https://lafeber.com/vet/wp-content/uploads/Aquatic-turtle-handout-color-copy.pdf).

The existing placeholder links were left untouched for the four deferred titles. The remaining listed items keep their current live calculator pages and were not duplicated.
