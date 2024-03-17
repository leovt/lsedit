
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
            let start_p = +props.getAttribute('Start');
            let start = {
                p: start_p,
                a: punkt.a,
                x: punkt.x + (start_p - punkt.p) * Math.cos(angle(punkt.a)),
                y: punkt.y + (start_p - punkt.p) * Math.sin(angle(punkt.a)),
                z: punkt.z
            }
            if (start.p<punkt.p) {
                ul.appendChild('Fehler Reihenfolge Kurven');
            }
            if (start.p>punkt.p) {
                spec.push(start);
                ul.appendChild(createLi(`Kurve Start ${JSON.stringify(start)}`));
                svg_path_data += `L${start.x} ${start.y}`;
                {
                    let c = document.createElementNS('http://www.w3.org/2000/svg',"circle");
                    c.setAttributeNS(null, "cx", start.x);
                    c.setAttributeNS(null, "cy", start.y);
                    c.setAttributeNS(null, "r", "7");
                    c.dataset.track = name;
                    c.dataset.position = start.p;
                    c.addEventListener('mouseenter', showInfo);
                    c.addEventListener('mouseleave', clearInfo);
        ggleis.appendChild(c);
                }        
            }
            let ende_p = +props.getAttribute('Ende');
            let winkel = + props.getAttribute('Winkel');
            let ende_a = start.a + winkel;
            let radius = (ende_p - start.p) / (-winkel * DEGREES);
            ul.appendChild(createLi(`Kurve Radius ${radius}`));
            let ende = {
                p: ende_p,
                a: ende_a,
                x: start.x + radius * (Math.sin(angle(ende_a)) - Math.sin(angle(start.a))),
                y: start.y - radius * (Math.cos(angle(ende_a)) - Math.cos(angle(start.a))),
                z: start.z
            }
            spec.push(ende);
            punkt = ende;
            ul.appendChild(createLi(`Kurve Ende ${JSON.stringify(ende)}`));
            svg_path_data += `A${radius} ${radius} 0 ${Math.abs(winkel)>180?1:0} ${winkel<0?1:0} ${ende.x} ${ende.y}`;
            {
                let c = document.createElementNS('http://www.w3.org/2000/svg',"circle");
                c.setAttributeNS(null, "cx", ende.x);
                c.setAttributeNS(null, "cy", ende.y);
                c.setAttributeNS(null, "r", "7");
                c.dataset.track = name;
                c.dataset.position = ende.p;
                c.addEventListener('mouseenter', showInfo);
                c.addEventListener('mouseleave', clearInfo);
                    ggleis.appendChild(c);
            }        
    }
        if (punkt.p < track_end) {
            let ende = {
                p: track_end,
                a: punkt.a,
                x: punkt.x + (track_end - punkt.p) * Math.cos(angle(punkt.a)),
                y: punkt.y + (track_end - punkt.p) * Math.sin(angle(punkt.a)),
                z: punkt.z
            }
            spec.push(ende);
            punkt = ende;
            ul.appendChild(createLi(`Gleis Ende ${JSON.stringify(ende)}`));
            svg_path_data += `L${ende.x} ${ende.y}`;
            {
                let c = document.createElementNS('http://www.w3.org/2000/svg',"circle");
                c.setAttributeNS(null, "cx", ende.x);
                c.setAttributeNS(null, "cy", ende.y);
                c.setAttributeNS(null, "r", "7");
                c.dataset.track = name;
                c.dataset.position = ende.p;
                c.addEventListener('mouseenter', showInfo);
                c.addEventListener('mouseleave', clearInfo);
                    ggleis.appendChild(c);
            }        
    }

        path.setAttributeNS(null, 'd', svg_path_data);

        document.getElementById('LS').appendChild(ggleis);
    }
}

