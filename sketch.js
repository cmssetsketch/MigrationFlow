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
let years = ["1990","2000","2010","2020","2024"];
let selectedYear = years[6];

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

  setupButtons(); 
  precomputeVertices(); 
  drawButtons();
  document.addEventListener("pointerdown", ev => {
  // If click is outside any bar, reset
  if (!ev.target.classList.contains("origine-bar") &&
      !ev.target.classList.contains("destination-bar")) {
    resetHighlight();
  }
});
}


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
let orMin = Infinity;
let orMax = -Infinity;

function InitializeData() {
  const dictPays = MigWorld.Pays[selectedCountry];
  if (!dictPays) return;

  sortedByYear = {}; // reset

  // --- Step 1: collect all partner countries that have >0 in any year ---
  const allCountries = new Set();
  for (let year of years) {
    const yearData = dictPays[year];
    if (!yearData) continue;
    for (let [country, value] of Object.entries(yearData)) {
      if (value > 0) allCountries.add(country);
    }
  }

  const keepCountries = Array.from(allCountries);

  // --- Step 2: build per-year sorted lists (highest → lowest) ---
  for (let year of years) {
    const yearData = dictPays[year] || {};
    const yearList = keepCountries.map(country => [
      country,
      yearData[country] || 0
    ]);

    // Sort descending for this specific year
    yearList.sort((a, b) => b[1] - a[1]);

    sortedByYear[year] = yearList;
  }

  // --- Step 3: compute min/max across all years ---
  orMin = Infinity;
  orMax = -Infinity;

  for (let year of years) {
    const entries = sortedByYear[year];
    if (!entries) continue;
    for (let [_, value] of entries) {
      if (value < orMin) orMin = value;
      if (value > orMax) orMax = value;
    }
  }
}


let destination = {};
let destMin = Infinity;
let destMax = -Infinity;
let globalMin = Infinity, globalMax = -Infinity;
let globalAvg = 0;

function buildDestinations() {
  if (!selectedCountry) return;
  destination = {};

  // --- Step 1: collect all origin countries that have >0 in any year ---
  const allCountries = Object.keys(MigWorld.Pays);
  const countriesToKeep = allCountries.filter(originCountry => {
    const dictPays = MigWorld.Pays[originCountry];
    if (!dictPays) return false;
    return years.some(year => {
      const val = dictPays[year]?.[selectedCountry] || 0;
      return val > 0;
    });
  });

  // --- Step 2: build per-year destination lists, sorted by value (desc) ---
  for (let year of years) {
    let yearList = [];

    for (let originCountry of countriesToKeep) {
      const dictPays = MigWorld.Pays[originCountry];
      if (!dictPays) continue;
      const yearData = dictPays[year] || {};
      const dvalue = yearData[selectedCountry] || 0;
      yearList.push([originCountry, dvalue]);
    }

    // Sort descending for this specific year
    yearList.sort((a, b) => b[1] - a[1]);

    destination[year] = yearList;
  }

  // --- Step 3: compute min/max across all years ---
  destMin = Infinity;
  destMax = -Infinity;

  for (let year of years) {
    const entries = destination[year];
    if (!entries) continue;
    for (let [_, value] of entries) {
      if (value < destMin) destMin = value;
      if (value > destMax) destMax = value;
    }
  }
}



function computeGlobalScale() {
  globalMin = Math.min(orMin, destMin);
  globalMax = Math.max(orMax, destMax);
  const allValues = [];

  for (let year in sortedByYear) {
    for (let [_, v] of sortedByYear[year]) allValues.push(v);
  }
  for (let year in destination) {
    for (let [_, v] of destination[year]) allValues.push(v);
  }

  // Compute average (mean)
  if (allValues.length > 0) {
    const sum = allValues.reduce((a, b) => a + b, 0);
    globalAvg = sum / allValues.length;
  } else {
    globalAvg = (globalMin + globalMax) / 2;
  }
}


function drawOrigineAll() {
  if (!origineBarsDiv) {
    console.error("drawOrigine: origineBarsDiv is NOT defined.");
    return;
  }

  origineBarsDiv.innerHTML = ""; // clear old

  const containerWidth = origineBarsDiv.clientWidth;
  const years = Object.keys(sortedByYear); 
  const y0 = 20;

  const frag = document.createDocumentFragment();

  years.forEach((year, yearIndex) => {
    const entries = sortedByYear[year];
    if (!entries || !Array.isArray(entries)) return;

    const colWidth = containerWidth / years.length;
    const colCenterX = Math.round(yearIndex * colWidth + colWidth / 2);
    let currentY = y0;
let baseHeight = 10;
    // Year label
    const yearLabel = document.createElement("div");
    yearLabel.textContent = year;
    yearLabel.style.position = "absolute";
    yearLabel.style.top = "0px";
    yearLabel.style.left = `${colCenterX}px`;
    yearLabel.style.transform = "translateX(-50%)";
    yearLabel.style.fontSize = "10px";
    yearLabel.style.color = "white";
    frag.appendChild(yearLabel);

    entries.forEach(([name, value]) => {
      if (value === 0) {
    currentY += baseHeight; // keep space for alignment
    return;
  }
const { width, height } = getBarSize(value, colWidth, baseHeight);


      const bar = document.createElement("div");
      bar.className = "origine-bar";
      bar.style.position = "absolute";
      bar.style.left = `${colCenterX - width / 2}px`;
      bar.style.top = `${currentY}px`;
      bar.style.width = `${width}px`;
      bar.style.height = `${height}px`;


      let rawColor = (typeof getCountryColor === "function") ? getCountryColor(name) : null;
      let cssColor = "#999";
      if (typeof rawColor === "string") cssColor = rawColor;
      else if (rawColor && rawColor.levels && Array.isArray(rawColor.levels)) {
        const [r,g,b,a] = rawColor.levels;
        const alpha = (typeof a === "number") ? (a/255) : 1;
        cssColor = `rgba(${r},${g},${b},${alpha})`;
      }
      bar.style.background = cssColor;

      bar.dataset.country = name;
      bar.dataset.value = value;
      bar.dataset.year = year;

      // Hover + click
bar.addEventListener("pointerenter", ev => {
  if (lockedCountry) return; // ignore hover if something is locked
  const formattedVal = Number(bar.dataset.value).toLocaleString("fr-FR");
  showHoverLabel(`${bar.dataset.country}\n${formattedVal}`, ev.pageX, ev.pageY, bar);
  highlightBars(bar.dataset.country, bar);
});

bar.addEventListener("pointerleave", ev => {
  if (lockedCountry) return; // ignore if locked
  hideHoverLabel();
  resetHighlight();
});

bar.addEventListener("pointerdown", ev => {
  ev.stopPropagation(); // prevent document click from firing immediately
  const country = bar.dataset.country;
  const formattedVal = Number(bar.dataset.value).toLocaleString("fr-FR");

  lockedCountry = country;
  showHoverLabel(`${country}\n${formattedVal}`, ev.pageX, ev.pageY, bar);
  highlightBars(country, bar);
});

      frag.appendChild(bar);
      currentY += height;
    });
  });

  origineBarsDiv.appendChild(frag);

  let maxRows = 0;
  Object.values(sortedByYear).forEach(arr => {
    if (Array.isArray(arr)) maxRows = Math.max(maxRows, arr.length);
  });
  origineBarsDiv.style.height = `${y0 + maxRows * 50+10}px`;
}


function drawDestinationAllYears() {
  if (!destinationBarsDiv) return;
  destinationBarsDiv.innerHTML = "";

  const containerWidth = destinationBarsDiv.clientWidth;
  const containerHeight = 300; // adjust as needed
  destinationBarsDiv.style.position = "relative";
  destinationBarsDiv.style.height = containerHeight + "px";

  const yearsToShow = years.slice(0, 8); // show 8 years
  const slotWidth = containerWidth / yearsToShow.length;

  yearsToShow.forEach((yr, yearIdx) => {
    const entries = destination[yr];
    if (!entries) return;

    const slotX = yearIdx * slotWidth;

    // --- Year label above bars ---
    const yearLabel = document.createElement("div");
    yearLabel.textContent = yr;
    yearLabel.style.position = "absolute";
    yearLabel.style.top = "0px";
    yearLabel.style.left = `${slotX + slotWidth / 2}px`;
    yearLabel.style.transform = "translateX(-50%)";
    yearLabel.style.color = "white";
    yearLabel.style.fontSize = "10px";
    destinationBarsDiv.appendChild(yearLabel);

    let y0 = 20; // space for label
    let currentY = y0;

    entries.forEach(([name, value]) => {
if (value === 0) {
        currentY += 10; // keep spacing for alignment
        return;
      }
      // Get dynamic size for bar
      const { width: rectW, height: barHeight } = getBarSize(value, slotWidth, 10);

      // color
      let cssColor = "#999";
      const rawColor = getCountryColor ? getCountryColor(name) : null;
      if (typeof rawColor === "string") cssColor = rawColor;

      // create bar
      const bar = document.createElement("div");
      bar.className = "destination-bar";
      bar.style.position = "absolute";
      bar.style.left = `${slotX + slotWidth / 2 - rectW / 2}px`; // center within slot
      bar.style.top = `${currentY}px`;
      bar.style.width = `${rectW}px`;
      bar.style.height = `${barHeight}px`;
      bar.style.background = cssColor;

      bar.dataset.country = name;
      bar.dataset.value = value;

      // hover events
bar.addEventListener("pointerenter", ev => {
  if (lockedCountry) return; // ignore hover if something is locked
  const formattedVal = Number(bar.dataset.value).toLocaleString("fr-FR");
  showHoverLabel(`${bar.dataset.country}\n${formattedVal}`, ev.pageX, ev.pageY, bar);
  highlightBars(bar.dataset.country, bar);
});

bar.addEventListener("pointerleave", ev => {
  if (lockedCountry) return; // ignore if locked
  hideHoverLabel();
  resetHighlight();
});

bar.addEventListener("pointerdown", ev => {
  ev.stopPropagation(); // prevent document click from firing immediately
  const country = bar.dataset.country;
  const formattedVal = Number(bar.dataset.value).toLocaleString("fr-FR");

  lockedCountry = country;
  showHoverLabel(`${country}\n${formattedVal}`, ev.pageX, ev.pageY, bar);
  highlightBars(country, bar);
});
           
      destinationBarsDiv.appendChild(bar);
      currentY += barHeight;
    });
  });
}


function keyPressed() {
  if (key === 'e') { // press E to export
exportBarsToSVG("destinationContainer", "destinations.svg");
exportBarsToSVG("origineContainer", "origins.svg");

  }
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
        buildDestinations();
        computeGlobalScale();
        drawDestinationAllYears();
drawOrigineAll();
        // reset all buttons
        countryButtonsDiv.querySelectorAll(".country-btn").forEach(el => {
          el.style.color = "white";
        });
        btn.style.color = getCountryColor(name);

        // --- Destination and Origine titles ---
        if (!document.getElementById("destinationTitle")) {
          const destinationTitle = document.createElement("div");
          destinationTitle.id = "destinationTitle";
          destinationTitle.textContent = "Number of emigrants \nby destinations";
          
          destinationTitle.style.whiteSpace = "pre-line";
          destinationTitle.style.textAlign = "center";
          destinationTitle.style.fontSize = "14px";
          destinationTitle.style.fontWeight = "normal";
          destinationTitle.style.marginTop = "20px";
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
          origineTitle.style.marginTop = "20px";
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

function getBarSize(value, colWidth, baseHeight = 10) {
  if (value == null || isNaN(value)) 
    return { width: colWidth * 0.02, height: baseHeight };

  // Avoid division by zero
  const range = globalMax - globalMin || 1;

  // Normalize 0–1 range
  let normalized = (value - globalMin) / range;
  normalized = Math.max(0, Math.min(1, normalized)); // clamp 0–1

  // Apply square-root curve and remap to 0.05–1
  const curved = Math.sqrt(normalized);
  const scaled = 0.02 + curved * (1 - 0.02);

  return {
    width: colWidth * scaled,
    height: baseHeight
  };
}



let hoverLabelDiv = null;

// Show hover label for one bar
function showHoverLabel(text, x, y, bar) {
  if (!hoverLabelDiv) {
    hoverLabelDiv = document.createElement("div");
    hoverLabelDiv.className = "hover-label";
    hoverLabelDiv.style.position = "absolute";
    hoverLabelDiv.style.pointerEvents = "none";
    hoverLabelDiv.style.background = "rgba(0,0,0,0.75)";
    hoverLabelDiv.style.color = "white";
    hoverLabelDiv.style.fontSize = "12px";
    hoverLabelDiv.style.padding = "4px 8px";
    hoverLabelDiv.style.borderRadius = "6px";
    hoverLabelDiv.style.whiteSpace = "normal";
    hoverLabelDiv.style.textAlign = "center"; // ⬅️ center text
    hoverLabelDiv.style.lineHeight = "1.2";
    hoverLabelDiv.style.zIndex = 9999;
    document.body.appendChild(hoverLabelDiv);
  }

const htmlText = text.replace(/\n/g, "<br>");
  hoverLabelDiv.innerHTML = htmlText;
  hoverLabelDiv.style.display = "block";

  // 🧭 Position based on the bar, not the mouse
  const rect = bar.getBoundingClientRect();

  // Center the label horizontally under the bar
  const labelWidth = hoverLabelDiv.offsetWidth || 50;
  const labelHeight = hoverLabelDiv.offsetHeight || 18;

  const left = rect.left + (rect.width / 2) - (labelWidth / 2) + window.scrollX;
  const top = rect.bottom + 6 + window.scrollY; // 6px gap under the bar

  hoverLabelDiv.style.left = `${left}px`;
  hoverLabelDiv.style.top = `${top}px`;
}


// Hide label
function hideHoverLabel() {
  if (hoverLabelDiv) {
    hoverLabelDiv.style.display = "none";
  }
}
let lockedCountry = null; // currently highlighted country

function highlightBars(name, activeBar) {
  const allBars = document.querySelectorAll(".origine-bar, .destination-bar");
  allBars.forEach(bar => bar.style.opacity = "0.25");
  allBars.forEach(bar => {
    if (bar.dataset.country === name) bar.style.opacity = "1";
  });
  if (activeBar) activeBar.style.opacity = "1";
}

function resetHighlight() {
  document.querySelectorAll(".origine-bar, .destination-bar").forEach(bar => {
    bar.style.opacity = "1";
  });
  lockedCountry = null;
  hideHoverLabel();
}
