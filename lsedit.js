
function handleFileSelect(event) {
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onload = function(event) {
        const fileContent = event.target.result;
        loadFile(fileContent);
    };

    reader.readAsText(file);
}

function createLi(innerText) {
    let li = document.createElement('li');
    li.innerText = innerText;
    return li;
}
function createP(innerText) {
    let li = document.createElement('p');
    li.innerText = innerText;
    return li;
}

const DEGREES = Math.PI / 180;

function angle(winkel) {
    return (90 - winkel) / 180 * Math.PI;
}

function showInfo(event) {
    let info = document.getElementById("info");
    info.innerHTML = '';
    for (prop in event.target.dataset) {
        info.appendChild(createP(`${prop}: ${event.target.dataset[prop]}`));
    }
}

function clearInfo(event) {
    let info = document.getElementById("info");
    info.innerHTML = '';
}

function loadFile(fileContent){
    let tree = document.getElementById('tree');
    tree.innerHTML = '';
    let root = document.createElement('ul');
    tree.appendChild(root);
    const parser = new DOMParser();
    xmlDoc = parser.parseFromString(fileContent, "text/xml");

    for (const gleis of xmlDoc.getElementsByTagName('GLEIS')) {
        let li = document.createElement('li');
        let name = gleis.getElementsByTagName('Props')[0].getAttribute('Name');
        li.innerText = name;
        root.appendChild(li);
        let ul = document.createElement('ul');
        li.appendChild(ul);
        let topo = gleis.getElementsByTagName('TOPOLOGIE')[0];
        let props = topo.getElementsByTagName('Erstellung')[0].getElementsByTagName('Props')[0];
        if (props.getAttribute('Typ') != 'Normal') {
            ul.appendChild(createLi(props.getAttribute('Typ')));
            continue;
        }
        ul.appendChild(createLi(`Length: ${props.getAttribute('EndPunkt')-props.getAttribute('StartPos')}`));
        let track_end = +props.getAttribute('EndPunkt');
        let start = props.getAttribute('StartPunkt').split(';');
        let track = new Track(+props.getAttribute('StartPos'), +props.getAttribute('EndPunkt'), 
            +start[0], +start[2], +start[1], +props.getAttribute('Winkel'));
        let spec = [];
        var punkt = {
            p: +props.getAttribute('StartPos'),
            a: +props.getAttribute('Winkel'),
            x: +start[0],
            y: +start[2], //yes, in that order!
            z: +start[1]
        }

        let ggleis = document.createElementNS('http://www.w3.org/2000/svg',"g");
        ggleis.setAttributeNS(null, 'class', 'gleis');

        let path = document.createElementNS('http://www.w3.org/2000/svg',"path");
        ggleis.appendChild(path)

        let svg_path_data = `M${punkt.x} ${punkt.y}`;
        {
            let c = document.createElementNS('http://www.w3.org/2000/svg',"circle");
            c.setAttributeNS(null, "cx", punkt.x);
            c.setAttributeNS(null, "cy", punkt.y);
            c.setAttributeNS(null, "r", "7");
            c.dataset.track = name;
            c.dataset.position = punkt.p;
            c.addEventListener('mouseenter', showInfo);
            c.addEventListener('mouseleave', clearInfo);
            ggleis.appendChild(c);
        }
        spec.push(punkt);
        ul.appendChild(createLi(`Gleis Start ${JSON.stringify(punkt)}`));

        for (const curve of topo.getElementsByTagName('KURVE')) {
            let props = curve.getElementsByTagName('Props')[0];
            track.addSegment(+props.getAttribute('Start'), 0);
            track.addSegment(+props.getAttribute('Ende'), +props.getAttribute('Winkel'));
        }
        for (const slope of topo.getElementsByTagName('STEIGUNG')) {
            let props = slope.getElementsByTagName('Props')[0];
            track.addSlope(+props.getAttribute('Start'), 0);
            track.addSlope(+props.getAttribute('Ende'), +props.getAttribute('Promille'));
        }
        track.addSegment(track_end, 0);
        track.addSlope(track_end, 0);
    
        track.pxy.forEach(pt => {
            let c = document.createElementNS('http://www.w3.org/2000/svg',"circle");
            c.setAttributeNS(null, "cx", pt.x);
            c.setAttributeNS(null, "cy", pt.y);
            c.setAttributeNS(null, "r", "7");
            c.dataset.track = name;
            c.dataset.position = pt.p;
            c.addEventListener('mouseenter', showInfo);
            c.addEventListener('mouseleave', clearInfo);
            ggleis.appendChild(c);
        });
        path.setAttributeNS(null, 'd', track.svgPathData());
        track.pathElement = path;
        document.getElementById('LS').appendChild(ggleis);
        if(name=="Gleis2") {
            showTrackProfile(track);
        }
    }
}

function height_at(east, north) {
    let j = Math.round((east - height_data.x0) / height_data.step);
    let i = Math.round((north - height_data.y0) / height_data.step);

    return height_data.grid[i][j];
}

class Track {
    constructor(start, end, start_x, start_y, start_z, start_angle) {
        this.start = start;
        this.end = end;
        this.pxy = [{p:start, x:start_x, y:start_y, a:start_angle, type:"M"}];
        this.pz = [{p:start, z:start_z}];
    }

    addSegment(end, da) {
        const last = this.pxy.slice(-1)[0];
        if (da == 0) {
            if (end > last.p) {
                this.pxy.push({
                    p: end,
                    a: last.a,
                    x: last.x + (end - last.p) * Math.cos(angle(last.a)),
                    y: last.y + (end - last.p) * Math.sin(angle(last.a)),
                    type: "L"
                });
            }
        }
        else {
            let a_end = last.a + da;
            let radius = (end - last.p) / (-da * DEGREES);
            this.pxy.push({
                p: end,
                a: a_end,
                x: last.x + radius * (Math.sin(angle(a_end)) - Math.sin(angle(last.a))),
                y: last.y - radius * (Math.cos(angle(a_end)) - Math.cos(angle(last.a))),
                da: da,
                radius: radius,
                type: "A"
            });
        }
    }

    addSlope(end, promille) {
        const last = this.pz.slice(-1)[0];
        this.pz.push({p: end, z: last.z + (end-last.p)*0.001*promille});
    }

    svgPathData() {
        let svg_path_data = "";
        this.pxy.forEach(function(p) {
            if (p.type=="A") {
                svg_path_data += `A${p.radius} ${p.radius} 0 ${Math.abs(p.da)>180?1:0} ${p.da<0?1:0} ${p.x} ${p.y}`;
            }
            else {
                svg_path_data += `${p.type}${p.x} ${p.y}`;
            }
        })
        return svg_path_data;
    }
}

// Find your root SVG element
var svg = document.getElementById('svgmap');

// Create an SVGPoint for future math
var pt = svg.createSVGPoint();

// Get point in global SVG space
function cursorPoint(evt){
  pt.x = evt.clientX; pt.y = evt.clientY;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
}

var info = document.getElementById('info');

svg.addEventListener('mousemove',function(evt){
  var loc = cursorPoint(evt);
  
  let east = loc.x + 2688500;
  let north = 1254000 - loc.y;

    info.innerText = `East: ${east.toFixed(2)}; North: ${north.toFixed(2)}; Height: ${height_at(east, north)}`;

},false);


function scaleProfile(start, end, low, high) {
    let g = document.getElementById("profiletransform");
    g.setAttribute('transform', `translate(3 8)scale(${35/(end-start)} ${5/(low-high)})translate(${-start} ${-low})`);
    for (let i=0; i<6; i += 1){
        document.getElementById(`lbl-x${i}`).textContent = (start + i/5*(end-start)).toFixed(0);
    }
    document.getElementById("lbl-zlow").textContent = low.toFixed(0);
    document.getElementById("lbl-zhigh").textContent = high.toFixed(0);
}

function showTrackProfile(track) {
    scaleProfile(track.start, track.end, 440, 460);
    let d = `M${track.start} 432`
    for(let s=track.start; s<=track.end; s+=10) {
        let p = track.pathElement.getPointAtLength(s - track.start);
        let z = height_at(p.x + 2688707, 1252025 + p.y);
        d += ` ${s} ${z}`;
    }
    let p = track.pathElement.getPointAtLength(track.end - track.start);
    let z = height_at(p.x + 2688707, 1252025 + p.y);
    d += ` ${track.end} ${z} ${track.end} 432Z`;
    document.getElementById("realprofile").setAttribute("d", d);

    d = "M";
    track.pz.forEach(pt => {
        d += ` ${pt.p} ${pt.z}`
    });
    document.getElementById("trackprofile").setAttribute("d", d);
}

