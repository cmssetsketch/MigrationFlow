let MigWorld;
let buttonCanvas; // visible canvas inside global container
let scaleFactor;
let buttons = [];
let countryButtons = [];
let selectedContinent = null;
let selectedCountry = null;
let buttonLayer;
let titleDiv;
let countryButtonsDiv;
let origineBarsDiv;
let destinationBarsDiv;
let creditDiv;
let yearSliderContainer;
let years = ["1990","1995","2000","2005","2010","2015","2020","2024"];
let selectedYear = years[7];

function preload() {
  MigWorld = loadJSON("MigWorld.json");

}

function setup() {
  requestAnimationFrame(initSketch);
}

function initSketch() {
  const globalDiv = document.getElementById("globalContainer");
  const buttonLayer = document.getElementById("buttonLayer");

  // --- Title ---
  titleDiv = document.createElement("div");
  titleDiv.id = "titleText";
  titleDiv.style.textAlign = "center";
  titleDiv.style.fontSize = "20px";
  titleDiv.style.margin = "10px 0";
  titleDiv.style.fontWeight = "bold";
  titleDiv.style.color = "white";
  titleDiv.style.position = "relative";
  titleDiv.style.zIndex = "10";
  globalDiv.insertBefore(titleDiv, buttonLayer);
   
  setTitle("the world", "white");

  // --- Canvas ---
  const w = Math.min(window.innerWidth * 0.9, 500);
  const h = w * (220 / 500);
  buttonCanvas = createCanvas(w, h);
  buttonCanvas.parent(buttonLayer);
  buttonCanvas.style('display', 'block');

  scaleFactor = buttonCanvas.width / 500;
buttonCanvas.elt.addEventListener('touchstart', () => {}, {passive: false});
  buttonCanvas.elt.addEventListener('pointerdown', () => {}, {passive: false});
  buttonCanvas.elt.addEventListener('mousedown', () => {}, {passive: false});
  setTimeout(() => drawButtons(), 50);
  // --- Country buttons container ---
  countryButtonsDiv = document.createElement("div");
  countryButtonsDiv.id = "countryButtons";
  countryButtonsDiv.style.display = "flex";
  countryButtonsDiv.style.justifyContent = "center";
  countryButtonsDiv.style.gap = "15px";
  countryButtonsDiv.style.marginTop = "10px"; // fixed spacing
  globalDiv.appendChild(countryButtonsDiv);
  
  setupBars();

  // --- Buttons setup ---
  setupButtons();   // your function to create buttons
  precomputeVertices(); // precompute polygon vertices for continents

  drawButtons();
}

// --- Precompute vertices so contains() works immediately ---
function precomputeVertices() {
  for (let btn of buttons) {
    if (btn.type === "continent" && btn.shapes) {
      btn.vertices = [];
      for (let shape of btn.shapes) {
        for (let v of shape) {
          btn.vertices.push([v[0] * scaleFactor + btn.x, v[1] * scaleFactor + btn.y]);
        }
      }
    }
  }

  // Country buttons bounding boxes
  for (let btn of countryButtons) {
    const fontSize = btn.wrappedLabel ? 13 : 15;
    const textW = btn.wrappedLabel
      ? Math.max(textWidth(btn.wrappedLabel[0]), textWidth(btn.wrappedLabel[1]))
      : textWidth(btn.label);
    const textH = btn.wrappedLabel ? fontSize + fontSize * 0.7 : fontSize;
    btn.vertices = [
      [btn.x - textW/2, btn.y - textH/2],
      [btn.x + textW/2, btn.y - textH/2],
      [btn.x + textW/2, btn.y + textH/2],
      [btn.x - textW/2, btn.y + textH/2]
    ];
  }
}

// --- Draw buttons on canvas ---
function drawButtons() {
  if (!buttonCanvas) return;
  buttonCanvas.clear();

  for (let btn of buttons) btn.show(scaleFactor);
  for (let btn of countryButtons) btn.show(scaleFactor);
}

// --- Touch handling for iPad / mobile ---
function pointerPressed() {
  const x = mouseX;
  const y = mouseY;

  for (let btn of buttons.concat(countryButtons)) {
    if (btn.contains(x, y)) {
      btn.click();
      drawButtons();
      return false;
    }
  }
  return false;
}

// --- Window resize ---
function windowResized() {
  if (!buttonCanvas) return;
  const w = Math.min(window.innerWidth * 0.9, 500);
  const h = w * (220 / 500);
  resizeCanvas(w, h);
  scaleFactor = buttonCanvas.width / 500;
  precomputeVertices();
  drawButtons();
}

function setupBars() {
  const origineDiv = document.getElementById("origineContainer");
  const destinationDiv = document.getElementById("destinationContainer");

  origineBarsDiv = document.createElement("div");
  origineBarsDiv.id = "origineBars";
  origineBarsDiv.style.position = "relative";
  origineBarsDiv.style.width = "100%";
  origineDiv.appendChild(origineBarsDiv);

  destinationBarsDiv = document.createElement("div");
  destinationBarsDiv.id = "destinationBars";
  destinationBarsDiv.style.position = "relative";
  destinationBarsDiv.style.width = "100%";
  destinationDiv.appendChild(destinationBarsDiv);
}

let sortedByYear = {}; 
let globalMin = Infinity;
let globalMax = -Infinity;

function InitializeData() {
  let dictPays = MigWorld.Pays[selectedCountry]; // JSON for one country
  sortedByYear = {}; // reset

  // --- Step 1: get baseline ranking from 2024 ---
  let baselineYear = "2024";
  let baselineData = dictPays[baselineYear];

  let ranking = [];
  if (baselineData) {
    ranking = Object.entries(baselineData)
      .filter(entry => entry[1] !== 0)   // remove 0 values
      .sort((a, b) => b[1] - a[1])       // sort by value desc
      .map(entry => entry[0]); 
  }

  for (let year of years) {
    let yearData = dictPays[year];
    if (!yearData) continue;

    // Rebuild in baseline ranking order
    let sorted = ranking
      .map(country => [country, yearData[country] || 0]) // ensure consistent order
      .filter(entry => entry[1] !== 0);// drop 0s if needed

    sortedByYear[year] = sorted;
  }

  // --- Step 3: compute global min/max ---
  globalMin = Infinity;
  globalMax = -Infinity;

  for (let year of years) {
    let entries = sortedByYear[year];
    if (!entries) continue;

    for (let [country, value] of entries) {
      if (value < globalMin) globalMin = value;
      if (value > globalMax) globalMax = value;
    }
  }
}

function buildDestinations() {
  if (!selectedCountry) return;
  destination = {};
  const baselineYear = "2024";
  let yearList2024 = [];

  for (let originCountry in MigWorld.Pays) {
    const dictPays = MigWorld.Pays[originCountry];
    if (!dictPays) continue;
    const yearData = dictPays[baselineYear];
    if (!yearData) continue;
    const dvalue = yearData[selectedCountry];
    if (dvalue && dvalue>0) yearList2024.push([originCountry,dvalue]);
  }

  yearList2024.sort((a,b)=>b[1]-a[1]);
  const ranking = yearList2024.map(e=>e[0]);

  for (let year of years) {
    let yearList = [];
    for (let originCountry of ranking) {
      const dictPays = MigWorld.Pays[originCountry];
      if (!dictPays) continue;
      const yearData = dictPays[year];
      if (!yearData) continue;
      const dvalue = yearData[selectedCountry]||0;
      if (dvalue>0) yearList.push([originCountry,dvalue]);
    }
    destination[year] = yearList;
  }
}

function drawOrigine(year = "2024") {

  // Basic existence checks
  if (typeof origineBarsDiv === "undefined" || origineBarsDiv === null) {
    console.error("drawOrigine: origineBarsDiv is NOT defined (no #origineBars element).");
    return;
  }

  const entries = sortedByYear[selectedYear];
  if (!entries || !Array.isArray(entries) || entries.length === 0) {
    console.warn(`drawOrigine: no entries for year "${year}".`, entries);
    origineBarsDiv.innerHTML = "";
    return;
  }

  origineBarsDiv.innerHTML = "";// Clear previous bars

  const containerWidth = origineBarsDiv.clientWidth;
  const colX = Math.round(containerWidth / 2); // center X
  let barHeight = 8;
  let rowHeight = barHeight; // no gap between bars
const y0 = 0;
  // Use a fragment to minimize reflows
  const frag = document.createDocumentFragment();

  for (let i = 0; i < entries.length; i++) {
    const [name, value] = entries[i];

    let rectW = 0;
    try {
      rectW = Math.round(getSizeRect(value, Math.max(50, Math.floor(containerWidth * 1))));
    } catch (err) {
      console.error("drawOrigine: error calling getSizeRect()", err);
      rectW = Math.max(2, Math.round(containerWidth * 0.05));
    }

    let rawColor = (typeof getCountryColor === "function") ? getCountryColor(name) : null;
    let cssColor = "#999";
    if (typeof rawColor === "string") {
      cssColor = rawColor;
    } else if (rawColor && rawColor.levels && Array.isArray(rawColor.levels)) {
      const [r,g,b,a] = rawColor.levels;
      const alpha = (typeof a === "number") ? (a/255) : 1;
      cssColor = `rgba(${r},${g},${b},${alpha})`;
    }

    const bar = document.createElement("div");
    bar.className = "origine-bar";
    bar.style.position = "absolute";
    bar.style.left = `${colX - rectW / 2}px`;
    bar.style.top = `${y0 + i * rowHeight}px`;
    bar.style.width = `${rectW}px`;
    bar.style.height = `${barHeight}px`;
    bar.style.background = cssColor;

    bar.dataset.country = name;
    bar.dataset.value = value;

    // Hover show label
bar.addEventListener("mouseenter", () => showHoverLabel(bar));
bar.addEventListener("mouseleave", hideHoverLabel);

bar.addEventListener("click", (ev) => {
 if (!this.dataset || !this.dataset.country) return;
  const countryName = bar.dataset.country;
  const val = bar.dataset.value;
  showHoverLabel(`${countryName}\n${val}`, ev.pageX, ev.pageY, bar);
  setTimeout(() => hideHoverLabel(), 2000);
});

origineBarsDiv.appendChild(bar);

  }
const totalHeight = y0 + entries.length * rowHeight;
  origineBarsDiv.style.height = `${totalHeight}px`;
  
}

function drawDestination(year = "2024") {
  if (typeof destinationBarsDiv === "undefined" || destinationBarsDiv === null) {
    console.error("drawDestination: destinationBarsDiv is NOT defined (no #destinationBars element).");
    return;
  }

  // Get entries for the requested year
  const entries = destination[selectedYear];
  if (!entries || !Array.isArray(entries) || entries.length === 0) {
    console.warn(`drawDestination: no entries for year "${year}".`, entries);
    destinationBarsDiv.innerHTML = "";
    return;
  }


  // Clear old bars
  destinationBarsDiv.innerHTML = "";

  const containerWidth = destinationBarsDiv.clientWidth;
  const colX = Math.round(containerWidth / 2); // center horizontally
  let barHeight = 8;
  let rowHeight = barHeight; // no gap between bars
  const y0 = 0;


  // Create bars
  for (let i = 0; i < entries.length; i++) {
    const [name, value] = entries[i];

    let rectW = 0;
    try {
      rectW = Math.round(getSizeRect(value, containerWidth));
    } catch (err) {
      console.error("drawDestination: error calling getSizeRect()", err);
      rectW = Math.max(2, Math.round(containerWidth * 0.05));
    }

    // Resolve color
    let rawColor = (typeof getCountryColor === "function") ? getCountryColor(name) : null;
    let cssColor = "#999";
    if (typeof rawColor === "string") {
      cssColor = rawColor;
    } else if (rawColor && rawColor.levels && Array.isArray(rawColor.levels)) {
      const [r, g, b, a] = rawColor.levels;
      const alpha = (typeof a === "number") ? (a / 255) : 1;
      cssColor = `rgba(${r},${g},${b},${alpha})`;
    }

    // Build bar element
    const bar = document.createElement("div");
    bar.className = "destination-bar";
    bar.style.position = "absolute";
    bar.style.left = `${colX - rectW / 2}px`;
    bar.style.top = `${y0 + i * rowHeight}px`;
    bar.style.width = `${rectW}px`;
    bar.style.height = `${barHeight}px`;
    bar.style.background = cssColor;

    bar.dataset.country = name;
    bar.dataset.value = value;

bar.addEventListener("mouseenter", () => showHoverLabel(bar));
bar.addEventListener("mouseleave", hideHoverLabel);

bar.addEventListener("click", (ev) => {
 if (!this.dataset || !this.dataset.country) return;
  const countryName = bar.dataset.country;
  const val = bar.dataset.value;
  showHoverLabel(`${countryName}\n${val}`, ev.pageX, ev.pageY, bar);
  setTimeout(() => hideHoverLabel(), 2000);
});


    destinationBarsDiv.appendChild(bar);
  }

  // Adjust height of container to fit bars
  const totalHeight = y0 + entries.length * rowHeight;
  destinationBarsDiv.style.height = `${totalHeight}px`;
}

function mousePressed() {
  const scaleFactor = buttonCanvas.width / 500;
  const mx = mouseX;
  const my = mouseY;
 
  for (let btn of buttons) { //check continent buttons
    if (btn.contains(mx, my)) {
      btn.click(); // click callback already redraws
      selectedContinent = btn.label;
      updateCountriesFromButton(selectedContinent);      
    }
  }
}


function setTitle(suffix, color = "white") {
  // main title
  titleDiv.innerHTML = `Migration across <span style="color:${color}">${suffix}</span>`;

  // --- source line ---
  let sourceLine = titleDiv.querySelector(".source-line");
  if (!sourceLine) {
    sourceLine = document.createElement("div");
    sourceLine.className = "source-line";
    sourceLine.style.fontSize = "10px";
    sourceLine.style.fontWeight = "normal"; // regular
    sourceLine.style.textAlign = "center";
    sourceLine.style.color = "white";
    sourceLine.style.marginTop = "2px";
    titleDiv.appendChild(sourceLine);
  }
  sourceLine.textContent = "source: United Nations Department of Economic and Social Affairs (2024)";
}


function updateCountriesFromButton(continentName) {
  if (!continentName || !(continentName in continents)) {
    setTitle("the world", "white");
    countryButtonsDiv.innerHTML = ""; 
    return;
  }

  setTitle(continentName, getCountryColor(continentName));
  const countries = continents[continentName];
  countryButtonsDiv.innerHTML = ""; 

  const total = countries.length;
  const containerWidth = countryButtonsDiv.offsetWidth;
let cols;
if (total < 5) {
  cols = 1;
} else if (total > 21 && containerWidth < 500) {
  cols = 2;  // only force 2 cols if width < 500
} else {
  cols = Math.min(3, total);
}

let rows = Math.ceil(total / cols);

  // create columns
  const colDivs = [];
  for (let c = 0; c < cols; c++) {
    const colDiv = document.createElement("div");
    colDiv.style.display = "flex";
    colDiv.style.flexDirection = "column";
    colDiv.style.alignItems = "flex-start";
    colDiv.style.margin = "0 10px";
    colDivs.push(colDiv);
    countryButtonsDiv.appendChild(colDiv);
  }

  // create country buttons
  let index = 0;
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows && index < total; r++, index++) {
      const name = countries[index];
      const wrapped = wrapLabel(name, 20);

      const btn = document.createElement("div");
      btn.classList.add("country-btn");
      btn.style.cursor = "pointer";
      btn.style.color = "white";
      btn.style.margin = "8px 0";
      btn.style.fontSize = "13px";
      btn.style.maxWidth = "140px";

      if (wrapped) {
        const line1 = document.createElement("div");
        line1.textContent = wrapped[0];
        line1.style.lineHeight = "13px";
        const line2 = document.createElement("div");
        line2.textContent = wrapped[1];
        line2.style.lineHeight = "13px";
        btn.appendChild(line1);
        btn.appendChild(line2);
      } else {
        btn.textContent = name;
        btn.style.lineHeight = "12px";
      }

      // click behavior
      btn.addEventListener("click", () => {
        selectedCountry = name;
        setTitle(name, getCountryColor(name));
        InitializeData();
        drawOrigine();
        buildDestinations();
        drawDestination();

        // reset all buttons
        countryButtonsDiv.querySelectorAll(".country-btn").forEach(el => {
          el.style.color = "white";
        });
        btn.style.color = getCountryColor(name);

        // --- Slider under country buttons ---
        const globalDiv = document.getElementById("globalContainer");
        const sliderWrapper = document.getElementById("sliderWrapper");
        if (countryButtonsDiv.nextSibling) {
  globalDiv.insertBefore(sliderWrapper, countryButtonsDiv.nextSibling);
} else {
  globalDiv.appendChild(sliderWrapper); // fallback if no sibling
}
sliderWrapper.innerHTML = ""; // clear previous slider
sliderWrapper.style.display = "flex";
sliderWrapper.style.flexDirection = "row";
sliderWrapper.style.alignItems = "center";
sliderWrapper.style.justifyContent = "center";
sliderWrapper.style.gap = "10px";
sliderWrapper.style.marginTop = "30px";

// title left
const sliderTitle = document.createElement("div");
sliderTitle.textContent = "Evolution";
sliderTitle.style.color = "white";
sliderTitle.style.fontSize = "14px";
sliderTitle.style.fontWeight = "bold";
sliderWrapper.appendChild(sliderTitle);

// slider middle
const yearSlider = document.createElement("input");
yearSlider.type = "range";
yearSlider.className = "year-slider";  // use CSS for styling
yearSlider.min = 0;
yearSlider.max = years.length - 1;
yearSlider.step = 1;
yearSlider.value = 7;
sliderWrapper.appendChild(yearSlider);

// year display right
const yearDisplay = document.createElement("div");
yearDisplay.textContent = years[7];
yearDisplay.style.color = "white";
yearDisplay.style.fontSize = "12px";
sliderWrapper.appendChild(yearDisplay);

// slider input
yearSlider.addEventListener("input", (e) => {
  hideHoverLabel();
  const idx = parseInt(e.target.value);
  selectedYear = years[idx];
  yearDisplay.textContent = selectedYear;
  drawOrigine();
  drawDestination();
});

        // --- Destination and Origine titles ---
        if (!document.getElementById("destinationTitle")) {
          const destinationTitle = document.createElement("div");
          destinationTitle.id = "destinationTitle";
          destinationTitle.textContent = "Number of emigrants \nby destinations";
          destinationTitle.style.whiteSpace = "pre-line";
          destinationTitle.style.textAlign = "center";
          destinationTitle.style.fontSize = "14px";
          destinationTitle.style.fontWeight = "normal";
          destinationTitle.style.marginTop = "10px";
          destinationTitle.style.marginBottom = "30px";
          destinationTitle.style.color = "white";
          destinationContainer.prepend(destinationTitle);
        }

        if (!document.getElementById("origineTitle")) {
          const origineTitle = document.createElement("div");
          origineTitle.id = "origineTitle";
          origineTitle.textContent = "Number of migrants \nby origines";
          origineTitle.style.whiteSpace = "pre-line";
          origineTitle.style.textAlign = "center";
          origineTitle.style.fontSize = "14px";
          origineTitle.style.fontWeight = "normal";
          origineTitle.style.marginTop = "10px";
          origineTitle.style.marginBottom = "30px";
          origineTitle.style.color = "white";
          origineContainer.prepend(origineTitle);
        }
      });

      colDivs[c].appendChild(btn);
    }
  }
}




function wrapLabel(label, maxLen) {
  if (!label || label.length <= maxLen) return null;

  const words = label.split(/\s+/);
  const lines = [];
  let cur = "";

  for (let i = 0; i < words.length; i++) {
    const w = words[i];

    if (cur.length === 0) { // start new line
      cur = w;
    } else if ((cur + " " + w).length <= maxLen) {
      cur = cur + " " + w;
    } else { // push current as a completed line
      lines.push(cur);// build second line from the rest
      const rest = [w].concat(words.slice(i + 1)).join(" ");
      lines.push(rest);
      cur = "";
      break;
    }
  }

  if (cur && lines.length < 2) lines.push(cur);
  if (lines.length < 2) return null;
  return [lines[0].trim(), lines[1].trim()];
}


function getCountryColor(country) {
for (let col in countryColors) {
    if (countryColors[col].includes(country)) {
      return col; // return the color string key
    }
  }

  return "#cccccc";
}

function getSizeRect(value, containerWidth) {
  const maxValue = 11000000; // adjust to dataset
  const scale = Math.sqrt(value) / Math.sqrt(maxValue);
  return Math.max(1, scale * containerWidth);
}

let hoverLabel;

function showHoverLabel(bar) {
  resetHighlight();
  const name = bar.dataset.country;
  const value = bar.dataset.value;
const formattedValue = value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  
  if (!hoverLabel) {
    hoverLabel = document.createElement("div");
    hoverLabel.style.position = "absolute";
    hoverLabel.style.color = "white";
    hoverLabel.style.fontSize = "13px";
    hoverLabel.style.padding = "4px 6px";
    hoverLabel.style.background = "rgba(0,0,0,0.7)";
    hoverLabel.style.borderRadius = "4px";
    hoverLabel.style.lineHeight = "1.2em";
    hoverLabel.style.pointerEvents = "none";
    hoverLabel.style.whiteSpace = "pre-line";
    document.body.appendChild(hoverLabel);
  }

  hoverLabel.textContent = `${name}\n${formattedValue}`;
  hoverLabel.style.display = "block";

  // Correct placement next to bar
const rect = bar.getBoundingClientRect();
const labelHeight = hoverLabel.offsetHeight || 20;
hoverLabel.style.left = `${rect.right + 10 + window.scrollX}px`;
hoverLabel.style.top = `${rect.top + rect.height / 2 - labelHeight / 2 + window.scrollY}px`;

  highlightBars(name, bar);
}

function hideHoverLabel() {
  if (hoverLabel) hoverLabel.style.display = "none";
  resetHighlight();
}


function highlightBars(name, activeBar) {
  const allBars = document.querySelectorAll(".origine-bar, .destination-bar");

  // dim everything
  allBars.forEach(bar => {
    bar.style.opacity = "0.25";
  });


  const matched = [];
  allBars.forEach(bar => {
    if (bar.dataset && bar.dataset.country === name) {
      bar.style.opacity = "1";
      matched.push(bar);
    }
  });

  // ensure the activeBar is full opacity
  if (activeBar) activeBar.style.opacity = "1";
  
  if ((!matched || matched.length === 0) && activeBar && activeBar._pairedLabel) {
  activeBar._pairedLabel.style.display = "none";
}

  matched.forEach(bar => {
    if (bar === activeBar) return;
    let lbl = bar._pairedLabel;
    if (!lbl) {
      lbl = document.createElement("div");
      lbl.className = "paired-value-label";
      lbl.style.position = "absolute";
      lbl.style.pointerEvents = "none";
      lbl.style.background = "rgba(0,0,0,0.75)";
      lbl.style.color = "white";
      lbl.style.fontSize = "12px";
      lbl.style.padding = "4px 6px";
      lbl.style.borderRadius = "4px";
      lbl.style.whiteSpace = "nowrap";
      lbl.style.zIndex = 9999;
      document.body.appendChild(lbl);
      bar._pairedLabel = lbl;
    }

    // set text and make visible
    const v = bar.dataset.value ?? "";
    lbl.textContent = String(v);

    // position the paired label to the right of the bar, 
    const rect = bar.getBoundingClientRect();

    lbl.style.display = "block";
    const labelHeight = lbl.offsetHeight || 18;
    lbl.style.left = `${rect.right + 8 + window.scrollX}px`;
    lbl.style.top  = `${rect.top + rect.height / 2 - labelHeight / 2 + window.scrollY}px`;
  });

  // hide other paired labels not part of current matched set
  allBars.forEach(bar => {
    if (bar._pairedLabel && !matched.includes(bar)) {
      bar._pairedLabel.style.display = "none";
    }
  });
}

// resetHighlight: restore all bars and remove paired labels
function resetHighlight() {
  const allBars = document.querySelectorAll(".origine-bar, .destination-bar");
  allBars.forEach(bar => {
    bar.style.opacity = "1";

    if (bar._pairedLabel) {
      if (bar._pairedLabel.parentNode) bar._pairedLabel.parentNode.removeChild(bar._pairedLabel);
      delete bar._pairedLabel;
    }
  });
}
