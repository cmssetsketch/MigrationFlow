class Button {
  constructor(x, y, label, onClick, shapes = null, type = "continent") {
    this.x = x;
    this.y = y;
    this.label = label;
    this.onClick = onClick;
    this.shapes = shapes;  
    this.type = type; // "continent" or "country"
    this.vertices = [];
  this.w = 100;
  this.h = 25;
  this.active = false;
  this.wrappedLabel = null;
    const rawColor = getCountryColor(label);
    this.col = color(rawColor);
}
    
  show(scaleFactor) {
  this.vertices = []; // reset each frame

  if (this.type === "continent") {
    const active = (this.label === selectedContinent);
    fill(active ? this.col : color(red(this.col), green(this.col), blue(this.col), 150));
    noStroke();

    if (this.shapes && Array.isArray(this.shapes)) {
      for (let shape of this.shapes) {
        beginShape();
        for (let v of shape) {
          // scaled coordinates relative to canvas
          const scaledX = v[0] * scaleFactor + this.x;
          const scaledY = v[1] * scaleFactor + this.y;
          vertex(scaledX, scaledY);

          // store absolute coordinates for hit detection
          this.vertices.push([scaledX, scaledY]);
        }
        endShape(CLOSE);
      }
    }
  } else if (this.type === "country") {
    push();
    translate(this.x, this.y);
    textAlign(CENTER, CENTER);
    let fontSize = this.wrappedLabel ? 13 : 15;
    textSize(fontSize);
    fill(this.label === selectedCountry ? this.col : 255);

    let textW = 0;
    let textH = fontSize;

    if (this.wrappedLabel) {
      const lineGap = fontSize * 0.7;
      text(this.wrappedLabel[0], 0, -lineGap/2);
      text(this.wrappedLabel[1], 0, lineGap/2);

      textW = Math.max(
        textWidth(this.wrappedLabel[0]),
        textWidth(this.wrappedLabel[1])
      );
      textH = fontSize + lineGap;
    } else {
      text(this.label, 0, 0);
      textW = textWidth(this.label);
      textH = fontSize;
    }

    // bounding box for hit detection
    this.vertices = [
      [this.x - textW/2, this.y - textH/2],
      [this.x + textW/2, this.y - textH/2],
      [this.x + textW/2, this.y + textH/2],
      [this.x - textW/2, this.y + textH/2]
    ];
    pop();
  }
}

  contains(px, py) {
    if (!this.vertices || this.vertices.length < 3) return false;

    if (this.type === "continent") {
      // polygon hit test
      let inside = false;
      const vs = this.vertices;
      for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        let xi = vs[i][0], yi = vs[i][1];
        let xj = vs[j][0], yj = vs[j][1];
        const intersect = ((yi > py) !== (yj > py)) &&
                          (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
      }
      return inside;

    } else if (this.type === "country") {
      // bounding box check
      return (
        px >= this.x - this.w / 2 &&
        px <= this.x + this.w / 2 &&
        py >= this.y - this.h / 2 &&
        py <= this.y + this.h / 2
      );
    }
  }

  click() {
    if (this.type === "country") {
      for (let b of countryButtons) b.active = false;
      this.active = true;
    }
    console.log("Button clicked:", this.label, this.type);
    if (this.onClick) this.onClick(this);
  }
}


function makeContinentButton(x, y, label, shapes) {
  return new Button(
    x, y, label,
    (btn) => {
      selectedContinent = btn.label;
      updateCountriesFromButton(selectedContinent); // show 
      drawButtons();
    },
    shapes,
    "continent"
  );
}


function setupButtons() {
  buttons = [];

  buttons.push(
  makeContinentButton(0, 0, "North America", [
   [ [0,0],[135,0],[135,49],[112,49],[112,73],[88,73],[88,90],[40,90],[40,73],[26,73],[26,49],[0,49]]
  ])
);  

buttons.push(
  makeContinentButton(0, 0, "Central America", [
   [ [26,73],[40,73],[40,90],[63,90],[63,110],[75,110],[75,121],[26,121]]
  ])
);  
  
    buttons.push(
  makeContinentButton(0, 0, "Caribbean", [
   [ [80,96],[116,96],[116,106],[80,106]]
  ])
);   

      buttons.push(
  makeContinentButton(0, 0, "South America", [
   [ [75,121],[120,121],[120,136],[147,136],[147,170],[136,170],[136,195],[112,195],[112,218],[95,218],[95,170],[75,170],[75,121]]
  ])
); 

buttons.push(
  makeContinentButton(0, 0, "Nothern Europe", [
 [[208,19],[244,19],[244,45],[208,45]],
  [[185,24],[197,24],[197,36],[185,36]]
  ])
);    

    buttons.push(
  makeContinentButton(0, 0, "Western Europe", [
   [ [198,45],[221,45],[221,57],[213,57],[213,64],[198,64]]
  ])
); 
  
buttons.push(
  makeContinentButton(0, 0, "Southern Europe", [
        [[185,64],[208,64],[208,77],[185,77],[185,64]],

    [[213,57],[221,57],[221,64],[242,64],[242,73],[213,73]]
  ])
);  
  
    buttons.push(
  makeContinentButton(0, 0, "Eastern Europe", [
   [ [244,19],[427,19],[427,49],[402,49],[402,61],[382,61],[382,49],[268,49],[268,64],[221,64],[221,45],[244,45]]
  ])
); 

buttons.push(
  makeContinentButton(0, 0, "Eastern Asia", [
        [[320,49],[382,49],[382,61],[402,61],[402,73],[388,73],[388,97],[353,97],[353,85],[320,85]],
    [[409,67],[419,67],[419,90],[409,90]]
  ])
);
  

  buttons.push(
  makeContinentButton(0, 0, "Central Asia", [
   [ [282,49],[320,49],[320,73],[282,73]]
  ])
);  

  buttons.push(
  makeContinentButton(0, 0, "Southern Asia",  [
   [ [282,73],[320,73],[320,85],[341,85],[341,97],[330,97],[330,122],[305,122],[305,92],[282,92]]
  ])
);  
  
  buttons.push(
  makeContinentButton(0, 0, "Western Asia", [
   [ [242,64],[268,64],[268,73],[282,73],[282,98],[294,98],[294,110],[268,110],[268,98],[257,98],[257,73],[242,73]]
  ])
);
  
buttons.push(
  makeContinentButton(0, 0, "Southeastern Asia", [
    [[341,85],[353,85],[353,97],[379,97],[379,121],[367,121],[367,133],[355,133],[355,110],[341,110]],

    [[390,121],[402,121],[402,142],[380,142],[380,130],[390,130]],

    [[410,140],[422,140],[422,152],[410,152]]
  ])
);
  
  buttons.push(
  makeContinentButton(0, 0, "Micronesia", [
   [ [445,115],[457,115],[457,127],[445,127]]
  ])
);   

  buttons.push(
  makeContinentButton(0, 0, "Polynesia", [
   [ [487,145],[500,145],[500,158],[487,158]]
  ])
);   

  buttons.push(
  makeContinentButton(0, 0, "Melanesia", [
   [ [422,140],[447,140],[447,152],[422,152]]
  ])
);  

buttons.push(
  makeContinentButton(0, 0, "Australia & New Zealand", [
    // first polygon
    [[378,158],[439,158],[439,203],[378,203]],

    // second polygon
    [[440,206],[464,206],[464,218],[440,218]]
  ])
);  
  
  buttons.push(
  makeContinentButton(0, 0, "Nothern Africa", [
   [ [175,80],[233,80],[233,87],[257,87],[257,121],[233,121],[233,101],[175,101]]
  ])
);

buttons.push(
  makeContinentButton(0, 0, "Eastern Africa", [
    // first polygon
    [[269,170],[282,170],[282,189],[269,189]],

    // second polygon
    [[244,121],[277,121],[277,145],[257,145],[257,195],[244,195],[244,171],[233,171],[233,157],[244,157]]
  ])
);
 
  
  buttons.push(
  makeContinentButton(0, 0, "Middle Africa", [
   [ [217,101],[233,101],[233,121],[244,121],[244,157],[233,157],[233,171],[217,171]]
  ])
);
 
  
  buttons.push(
  makeContinentButton(0, 0, "Western Africa", [
    [[175,101],[217,101],[217,134],[175,134]]
  ])
);
  
  buttons.push(
  makeContinentButton(0, 0, "Southern Africa", [
    [ [217,171],[244,171],[244,207],[217,207] ]  
    ]));  
}
