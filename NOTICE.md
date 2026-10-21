# Third-party notices

FitNext: Copyright (C) 2026 Jordan Gaskins.
FitNext's own code is licensed under the **GNU AGPL v3.0 or later** (see [LICENSE](LICENSE)).

## App store exception

As an additional permission under section 7 of the AGPL v3.0, the copyright holder permits
distribution of the FitNext mobile application through app store platforms (such as the Apple
App Store and Google Play) whose terms of service would otherwise be incompatible with the
AGPL, provided the corresponding source code remains available under the AGPL at the project
repository. This permission applies to the distribution channel only and does not otherwise
limit the license.

## openGym (exercise text and search)

The exercise catalog in `public/catalogue/` is built by `scripts/build-catalogue.mjs` from
the catalog of [**openGym**](https://github.com/DuarteSantos8/openGym), Copyright (C) 2026
Duarte Santos, under the **AGPL v3.0**. The exercise search in `src/lib/catalogue.js`
(tokenising, synonyms, typo tolerance and ranking) is ported from openGym's
`frontend/src/lib/exercises.js`, also under the AGPL v3.0. Exercise ids are openGym's, so
catalog fixes made there can be merged back in.

openGym's exercise media (Gym visual) is **not** included. See "Exercise animations" below.

## ExerciseDB text (MIT)

Catalog entries with `"src": "x"` (openGym's `"textSource": "exercisedb"`) keep names,
muscles and instructions from [**ExerciseDB v1**](https://exercisedb.dev/) by AscendAPI, which
reached openGym through [**hasaneyldrm/exercises-dataset**](https://github.com/hasaneyldrm/exercises-dataset):

```
MIT License

Copyright (c) 2026 Hasan Emir Yıldırım

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation and data files (the "Software"),
to deal in the Software without restriction, including without limitation the
rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
sell copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Exercise animations (CC0)

The animated figures come from [**Open Exercise Figures**](https://github.com/AbanoubAmir/open-exercise-figures),
released under **CC0 1.0** (public domain, no credit required; credited here anyway). They
match 1,394 catalog entries by ExerciseDB id. The app loads them from jsDelivr at a pinned
commit; none are stored in this repository.

## Body diagram geometry (MIT)

`src/lib/body-paths.js` is copied from openGym, which derived it from
[**MuscleMap**](https://github.com/melihcolpan/MuscleMap) by Melih Colpan:

```
MIT License

Copyright (c) 2026 Melih Colpan

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Food data

The app queries these services at run time and stores nothing from them in this repository.

- [**Open Food Facts**](https://world.openfoodfacts.org/): data under the
  [Open Database License](https://opendatacommons.org/licenses/odbl/1-0/), images under CC BY-SA.
  Called straight from the browser.
- [**USDA FoodData Central**](https://fdc.nal.usda.gov/): public domain (CC0).
- [**FatSecret Platform**](https://platform.fatsecret.com/) (Basic edition, free account), when a key is set.
  Its terms require a visible "Powered by fatsecret" attribution wherever its data appears.
- [**Edamam**](https://www.edamam.com/) food database (paid, $14/month after a 30-day trial), when a key is set. Its terms
  require the Edamam badge wherever its data appears.
- [**Spoonacular**](https://spoonacular.com/food-api) recipes (free tier), when a key is set.
- [**TheMealDB**](https://www.themealdb.com/) recipes and photos, through its free test API. Credited in Kitchen.
  Its terms require a backlink on the free plan.
