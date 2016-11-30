
var skyColor= 0xFFFFFF;
var assemblyPairs=[];
var namePairs=[];
var confDirs=null;
var unconfDirs=null;
var theDirections=[];
var theXML=null;
var thePos= new THREE.Vector3(1,0,0);
var lastMouse=null;
var theDistance= 300;
var theVectors= []; //new THREE.Line(  new THREE.Geometry(),  new THREE.LineBasicMaterial({color: 0x0000ff}))

var theEul= new THREE.Euler(0,0,0,'XYZ');
var baseQuat = new THREE.Quaternion(1,0,0,0);
var deltaQuat = new THREE.Quaternion(1,0,0,0);

var dragInp=false;

var textFile=null;


var wireSettings={transparent: true, opacity: 0.1, color: 0x444444, wireframe: false};


// Array for storing fileReaders to keep track of them
var fileReaders=[];

// Array for processed STLs
var STLs=[];

//  Array for processed parts
var parts=[];


var lastPair=null;
var currentPair=null;

var theWidth=document.getElementById("display").clientWidth;
var theHeight= document.getElementById("display").clientHeight;

// The scene of the assembly animation
var scene = new THREE.Scene();

// The camera
var camera = new THREE.PerspectiveCamera( 75, theWidth/theHeight, 1, 16000 );


var theXAxis=null;
var theYAxis=null;
var theZAxis=null;
var xRet=null;
var yRet=null;

// Setting up the renderer with the default color and display size
var renderer = new THREE.WebGLRenderer();
renderer.setClearColor( skyColor, 1 );
renderer.setSize(theWidth,theHeight);
console.log(theWidth);
console.log(theHeight);
document.getElementById("display").appendChild( renderer.domElement );

// Setting camera to Yaw-Pitch-Roll configuration
camera.rotation.reorder('YXZ');
camera.position.x=1;
camera.position.y=1;
camera.position.z=1;
console.log(camera.position);


// Adding in a whole bunch of lights for the scene, so the parts are well-lit
var directionalLight = new THREE.DirectionalLight( 0x888888 );
		directionalLight.position.x = 0; 
		directionalLight.position.y = 0; 
		directionalLight.position.z = 1; 
		directionalLight.position.normalize();
		scene.add( directionalLight );
		
var directionalLight = new THREE.DirectionalLight( 0x888888 );
		directionalLight.position.x = 0; 
		directionalLight.position.y = 1; 
		directionalLight.position.z = 0; 
		directionalLight.position.normalize();
		scene.add( directionalLight );
		
var directionalLight = new THREE.DirectionalLight( 0x888888 );
		directionalLight.position.x = 1; 
		directionalLight.position.y = 0; 
		directionalLight.position.z = 0; 
		directionalLight.position.normalize();
		scene.add( directionalLight );
var directionalLight = new THREE.DirectionalLight( 0x888888 );
		directionalLight.position.x = 0; 
		directionalLight.position.y = 0; 
		directionalLight.position.z = -1; 
		directionalLight.position.normalize();
		scene.add( directionalLight );
		
var directionalLight = new THREE.DirectionalLight( 0x888888 );
		directionalLight.position.x = 0; 
		directionalLight.position.y = -1; 
		directionalLight.position.z = 0; 
		directionalLight.position.normalize();
		scene.add( directionalLight );
		
var directionalLight = new THREE.DirectionalLight( 0x888888 );
		directionalLight.position.x = -1; 
		directionalLight.position.y = 0; 
		directionalLight.position.z = 0; 
		directionalLight.position.normalize();
		scene.add( directionalLight );


// Adding in one more light 
var sunLight = new THREE.SpotLight( 0x666666, 6, 32000, 1.2, 1, 1 );
		sunLight.position.set( 4000, 4000, 4000 );
		scene.add( sunLight );



function confirmPair(theButton){
	document.getElementById("confirmed").appendChild(theButton.parentElement);
	theButton.innerHTML="unconfirm";
	theButton.onclick=function(){
		deconfirmPair(theButton);
	};
}

function deconfirmPair(theButton){
	document.getElementById("unconfirmed").appendChild(theButton.parentElement);
	theButton.innerHTML="confirm";
	theButton.onclick=function(){
		confirmPair(theButton);
	};
}


function changeCurrentPair(theButton){
	
	if(lastPair!==null){
		return;
	}
	
	lastPair=currentPair;
	var theRef=theButton.parentElement.Ref;
	var theMov=theButton.parentElement.Mov;
	var pos=0;
	var lim=assemblyPairs.length;
	while(pos<lim){
		if(assemblyPairs[pos].Ref.Name===theRef & assemblyPairs[pos].Mov.Name===theMov){
			currentPair=assemblyPairs[pos];
			return;
		}
		pos++;
	}
	
}


function grab(theTree,theMember){

	if($(theTree).children(theMember).length!=0){
		return $(theTree).children(theMember)[0];
	}
	else{
		return null;
	}

}


var time=0;
var focusBox;
var focusPoint;

var render = function () {

	// The function that will manage frame requests
	requestAnimationFrame( render );
	
	if(lastPair!==null){
		var holder=currentPair;
		currentPair=lastPair;
		deHighlight(currentPair);
		currentPair=holder;
		highlight(currentPair);
		lastPair=null;
	}
	
	currentPair.Ref.Mesh.geometry.computeBoundingBox();
	currentPair.Mov.Mesh.geometry.computeBoundingBox();
	focusBox=currentPair.Ref.Mesh.geometry.boundingBox.clone();
	focusBox.union(currentPair.Mov.Mesh.geometry.boundingBox);
	
	focusPoint= new THREE.Vector3(
								  (focusBox.min.x+focusBox.max.x)/2,
								  (focusBox.min.y+focusBox.max.y)/2,
								  (focusBox.min.z+focusBox.max.z)/2
								 );
	
	thePos.normalize();
	
	thePos.applyEuler(theEul);
	theEul.set(0,0,0,'XYZ');
	thePos.multiplyScalar(theDistance);
	camera.position.copy(thePos);
	camera.position.add(focusPoint);
	camera.lookAt(focusPoint);
	camera.updateMatrix();
	
	sunLight.position.set( (camera.position.x-focusPoint.x)*2+focusPoint.x,
						   (camera.position.y-focusPoint.y)*2+focusPoint.y, 
						   (camera.position.z-focusPoint.z)*2+focusPoint.z );
	sunLight.target.position=focusPoint;
	
	
	time+=0.01;
	
	updateAxisLines();
	
	// Call for the render
	renderer.render(scene, camera);
};











/**
*
* Accepts a string and outputs the string of all characters following the final '.' symbol
* in the string. This is used internally to extract file extensions from file names.
*
* @method grabExtension
* @for dirConfirmGlobal
* @param {String} theName The file name to be processed
* @return {String} the extension in the given file name. If no extension is found, the 
* 'undefined' value is returned.
* 
*/
function grabExtension(theName){
	return (/[.]/.exec(theName)) ? /[^.]+$/.exec(theName) : undefined;
}

// Returns from the given list of file readers those that have not completed loading
function whoIsLeft(theReaders){

	var pos=0;
	var lim=fileReaders.length;
	var theList=[];
	while(pos<lim){
		if(theReaders[pos].Reader.readyState!=2){
			theList.push(theReaders[pos].Name);
		}
		pos++;
	}
	console.log(theList);

}




/**
*
* Accepts a fileinput event, presumably from a file upload event listener, and assigns
* functions to each file reader listed in the event to be called upon the full loading
* of that given reader's files 
*
* @method readMultipleFiles
* @for dirConfirmGlobal
* @param {Event} evt A fileinput event, to be given by a fileinput event listener
* @return {Void}
* 
*/
function readMultipleFiles(evt) {
	//Retrieve all the files from the FileList object
	var files = evt.target.files; 
			
	if (files) {
		for (var i=0, f; f=files[i]; i++) {
			
			var r = new FileReader();
			var extension=grabExtension(f.name)[0];
			//console.log(f.name);
			
			if(extension===undefined){
				continue;
			}
			if(extension.toLowerCase()==="stl"){
				r.onload = (function(f) {
					return function(e) {
					//console.log(f.name);
						var contents = e.target.result;
						if(r.result!=null){
							STLs.push(r.result);
						}
						loadParts();
					};
				})(f);
				r.readAsArrayBuffer(f);
				fileReaders.push({Reader: r, Name: f.name});
			}
			else if(extension.toLowerCase()==="xml"){
				console.log(f.name);
				if(!(theXML===null)){
					console.log("Warning: More than one XML file provided");
				}
				r.onload = (function(f) {
					return function(e) {
						//console.log(f.name);
						var contents = e.target.result;
						theXML=e.target.result;
						loadParts();
					};
				})(f);
				r.readAsText(f,"US-ASCII");
				fileReaders.push({Reader: r, Name: f.name});
			}
						
		}
		console.log(fileReaders);
	} 
	else {
		  alert("Failed to load files"); 
	}
}


// Inserts the file loading manager into the document
document.getElementById('fileinput').addEventListener('change', readMultipleFiles, false);


/**
*
* Called internally upon every recieved fileload event. Checks if every file reader in the 
* array "fileReaders" has fully read each of their files. If so, then the function converts
* all recieved stl files into threeJS models and executes "renderParts".
*
* @method loadParts
* @for dirConfirmGlobal
* @return {Void}
* 
*/
function loadParts (){

	
		// Looks for unloaded files
		var pos=0;
		var lim=fileReaders.length;
		while(pos<lim){
			if(!(fileReaders[pos].Reader.readyState===2)){
				//console.log(pos);
				//console.log(fileReaders[pos].Name);
				break;
			}
			pos++;
		}
	
	
	// Executes if all files are loaded
	if(pos===lim){
		//console.log("ALL DONE");
		parts.length=0;
		pos=0;
		var partGeom=null;
		var partMesh;
		var theCenter;
		var ext;
		while(pos<lim){
			ext=grabExtension(fileReaders[pos].Name)[0];

			if(ext.toLowerCase()==="stl"){
				
				partGeom=parseStl(fileReaders[pos].Reader.result);
				if(partGeom===null){
					partGeom=parseStlBinary(fileReaders[pos].Reader.result);
				}
				
				//console.log(partGeom);
				
				partMesh=new THREE.Mesh( 
						partGeom,
						new THREE.MeshLambertMaterial(wireSettings)
				);
				parts.push({
					Mesh: partMesh,
					Name: fileReaders[pos].Name
				})
				scene.add(partMesh);	
			}
			
			pos++;
		}
		
		parseData();
		linkParts();
		console.log(assemblyPairs);
		highlight(assemblyPairs[0]);
		lastPair=assemblyPairs[0];
		currentPair=assemblyPairs[0];
		console.log("setting up currentPair");
		console.log(currentPair);
		insertAssemblyPairs();
		initAxisLines();
		render();
		
	}
	

}

function linkPair(a,b,vec){
	
	var thePair={Ref: null,
				 Mov: null,
				 Vec: null,
				 Directed: null,
				 DoublyDirected: null,
				 InfiniteDirections: null};
	
	//console.log(parts);
	
	var pos=0;
	var lim=parts.length;
	while(pos<lim){

		if(parts[pos].Name===a+".STL" || parts[pos].Name===a){
			thePair.Ref=parts[pos];
		}
		if(parts[pos].Name===b+".STL" || parts[pos].Name===b){
			thePair.Mov=parts[pos];
		}
		if(thePair.Ref!==null && thePair.Mov!==null){
			thePair.Vec=vec;
			return thePair;
		}
		pos++;
	}
	//console.log(thePair);
	return null;
	
}

function linkParts(){
	
	var pos=0;
	var lim=namePairs.length;
	var thePair=null;
	
	while(pos<lim){
		thePair=linkPair(namePairs[pos].Ref,namePairs[pos].Mov,namePairs[pos].Vec);
		
		if(thePair!=null){
			thePair.InfiniteDirections = namePairs[pos].InfiniteDirections;
			assemblyPairs.push(thePair);
		}
		else{
		}
		pos++;
	}
	//console.log(assemblyPairs);
}

function parseData(){
	
	//console.log(theXML);
	var doc = $.parseXML(theXML);
	//console.log(doc);
	doc = grab(doc,"DirectionSaveStructure");
	var directions = grab(doc,"Directions");
	directions = $(directions).children("ArrayOfDouble");
	var thePairs=grab(doc,"arcs");
	//console.log(thePairs);

	thePairs=$(thePairs).children("arc");
	//console.log(thePairs);
	var pos=0;
	var lim=thePairs.length;
	var thePair;
	var theMov;
	var theRef;
	var theVec;
	var vecPos;
	var vecLim;
	var directed;
	var docDirs;
	var doublyDirected;
	var docDubDirs;
	var infiniteDirections;
	var docInfDirs;
	
	while(pos<lim){
		theRef=grab(thePairs[pos],"To");
		theMov=grab(thePairs[pos],"From");
		
		
		docDirs=grab(thePairs[pos],"directed");
		directed=[];
		
		docDubDirs=grab(thePairs[pos],"doublyDirected");
		doublyDirected=[];
		
		
		docInfDirs=grab(thePairs[pos],"InfiniteDirections");
		infiniteDirections=[];
		
		docFinDirs=grab(thePairs[pos],"FiniteDirections");
		finiteDirections=[];
		
		
		
		if($(docDirs[vecPos]).innerHTML != "false"){
			docDirs = $(docDirs).children("int");
			vecPos=0;
			vecLim=docDirs.length;
			while(vecPos<vecLim){
				theVec=parseInt(docDirs[vecPos].innerHTML);
				directed.push(theVec);
				vecPos++;
			}
		}
		
		
		if($(docDubDirs[vecPos]).innerHTML != "false"){
			docDubDirs = $(docDubDirs).children("int");
			vecPos=0;
			vecLim=docDubDirs.length;
			while(vecPos<vecLim){
				theVec=parseInt(docDubDirs[vecPos].innerHTML);
				doublyDirected.push(theVec);
				vecPos++;
			}
		}
		
		if($(docInfDirs[vecPos]).innerHTML != "false"){
			docInfDirs = $(docInfDirs).children("int");
			vecPos=0;
			vecLim=docInfDirs.length;
			while(vecPos<vecLim){
				theVec=parseInt(docInfDirs[vecPos].innerHTML);
				infiniteDirections.push(theVec);
				vecPos++;
			}
		}
		
		/*
		if($(docFinDirs[vecPos]).innerHTML != "false"){
			docFinDirs = $(docInfDirs).children("int");
			vecPos=0;
			vecLim=docFinDirs.length;
			while(vecPos<vecLim){
				theVec=parseInt(docFinDirs[vecPos].innerHTML);
				finiteDirections.push(theVec);
				vecPos++;
			}
		}
		*/
		theVec=grab(thePairs[pos],"vector");
		namePairs.push({
			name: grab(thePairs[pos],"name").innerHTML,
			Ref: theRef.innerHTML,
			Mov: theMov.innerHTML,
			localLabels: grab(thePairs[pos],"localLabels").innerHTML,
			localVariables: grab(thePairs[pos],"localVariables").innerHTML,
			Directed: grab(thePairs[pos],"Directed").innerHTML,
			DoublyDirected: grab(thePairs[pos],"DoublyDirected").innerHTML,
			InfiniteDirections: infiniteDirections,
			FiniteDirections: grab(thePairs[pos],"FiniteDirections").innerHTML,
			Fasteners: grab(thePairs[pos],"Fasteners").innerHTML,
			Certainty: grab(thePairs[pos],"Certainty").innerHTML,
			ConnectionType: grab(thePairs[pos],"ConnectionType").innerHTML
		});
		pos++;
	}
	
	
	pos=0;
	lim=directions.length;
	var theDirection;
	while(pos<lim){
		theDirection=$(directions[pos]).children("double");
		theDirections.push({
			X: parseFloat(theDirection[0].innerHTML),
			Y: parseFloat(theDirection[1].innerHTML),
			Z: parseFloat(theDirection[2].innerHTML)
		});
		pos++;
	}	
	
	//console.log(namePairs);
	
}


function insertAssemblyPairs(){
	
	var pos=0;
	var lim=assemblyPairs.length;
	while(pos<lim){
		var theDiv = document.createElement("div");
		var theText = document.createElement("text");
		theText.innerHTML = assemblyPairs[pos].Ref.Name + " \n<---\n " + assemblyPairs[pos].Mov.Name;
		var theConfBut = document.createElement("button");
		theConfBut.innerHTML = "confirm";
		theConfBut.onclick = function (){
			confirmPair(this);
		}
		var theHighlightBut = document.createElement("button");
		theHighlightBut.innerHTML = "focus";
		theHighlightBut.onclick = (function(position){
			return function(){
				lastPair=currentPair;
				console.log("assigning currentPair");
				console.log(position);
				console.log(assemblyPairs[position]);
				currentPair=assemblyPairs[position]; 
				console.log ("Doing the focus thing");
			}
		})(pos);
		theText.className="pairText";
		theConfBut.className="dirButton";
		theHighlightBut.className="dirButton";
		theDiv.appendChild(theText);
		theDiv.appendChild(document.createElement("br"));
		theDiv.appendChild(theHighlightBut);
		theDiv.appendChild(theConfBut);
		theDiv.className="dirPair";
		document.getElementById("unconfirmed").appendChild(theDiv);
		pos++;
	}
	pos--;
	
}



function deHighlight(thePair){
	console.log("The number of vectors is ",theVectors.length);
	removeVectorView(document.getElementById("expandButton"));
	thePair.Ref.Mesh.material=new THREE.MeshLambertMaterial(wireSettings);
	thePair.Mov.Mesh.material=new THREE.MeshLambertMaterial(wireSettings);
}



function highlight(thePair){
	
	console.log(thePair);
	thePair.Ref.Mesh.material=new THREE.MeshLambertMaterial({color: 0x4444FF /*, transparent: true, opacity: 0.6, depthTest: false */});
	thePair.Mov.Mesh.material=new THREE.MeshLambertMaterial({color: 0xFF4444 /*, transparent: true, opacity: 0.6, depthTest: false */});
	thePair.Ref.Mesh.geometry.computeBoundingBox();
	thePair.Mov.Mesh.geometry.computeBoundingBox();
	var theBox=thePair.Mov.Mesh.geometry.boundingBox.clone();
	var distBox = thePair.Mov.Mesh.geometry.boundingBox.clone();
	distBox.union(thePair.Ref.Mesh.geometry.boundingBox);
	
	
	
	var pos=0;
	var lim=theVectors.length;
	while(pos<lim){
		scene.remove( theVectors[pos] );
		pos++;
	}
	

	theVectors.length=0;
	console.log("Just set the Vectors to 0");
	console.log("The pair is: ", thePair);
	var theVec;
	
	var theDist = Math.sqrt(Math.pow(distBox.max.x-distBox.min.x,2)+
							Math.pow(distBox.max.y-distBox.min.y,2)+
							Math.pow(distBox.max.y-distBox.min.y,2));
	
	
	pos=0;
	lim=thePair.InfiniteDirections.length;
	while(pos<lim){
		theVec = new THREE.Line(  new THREE.Geometry(),  new THREE.LineBasicMaterial({color: 0xff0000}));
		theVec.geometry.vertices[0]=new THREE.Vector3(
								  (theBox.min.x+theBox.max.x)/2,
								  (theBox.min.y+theBox.max.y)/2,
								  (theBox.min.z+theBox.max.z)/2
								 );
		theVec.geometry.vertices[1]=new THREE.Vector3(theDist*theDirections[thePair.InfiniteDirections[pos]].X,
													  theDist*theDirections[thePair.InfiniteDirections[pos]].Y,
													  theDist*theDirections[thePair.InfiniteDirections[pos]].Z);
		theVec.geometry.vertices[1].add(theVec.geometry.vertices[0]);
		theVec.geometry.verticesNeedUpdate=true;
		scene.add(theVec);
		theVectors.push(theVec);
		console.log("Vector List Size is: ",theVectors.length);
		pos++;
	}
	
	insertVectorView(document.getElementById("expandButton"));

}



function fixOpacity(theSlider){
	
	console.log("Changing Opacity");
	var val = theSlider.value;
	wireSettings.opacity=val;
	var pos=0;
	var lim=parts.length;
	while(pos<lim){
		if(parts[pos].Mesh!=currentPair.Ref.Mesh && parts[pos].Mesh!=currentPair.Mov.Mesh){
			parts[pos].Mesh.material=new THREE.MeshLambertMaterial(wireSettings);
		}
		pos++;
	}
	
}


function doMouseUp(){
	dragInp=false;
}

function doMouseDown(){
	dragInp=true;
}

function doMouseLeave(){
	dragInp=false;
	lastMouse=null;
}

function doDrag(theEvent){
	if(dragInp==true){
		thePos.normalize();
		theEul.set(theEvent.movementY*(-0.02)*Math.cos(Math.atan2(thePos.x,thePos.z)),
				   theEvent.movementX*(-0.02),
				   theEvent.movementY*(0.02)*Math.sin(Math.atan2(thePos.x,thePos.z)),
				   'ZYX'); 
	}
}

document.getElementById("display").addEventListener("mousemove", doDrag);


function doZoom(theEvent){
	theDistance=theDistance*Math.pow(1.001,theEvent.wheelDelta);	
}

document.getElementById("display").addEventListener("wheel", doZoom);

function insertVectorView(theButton){
	
	console.log("doing insertVectorView");
	
	if(currentPair==null){
		return;
	}
	
	currentPair.Ref.Mesh.geometry.computeBoundingBox();
	currentPair.Mov.Mesh.geometry.computeBoundingBox();
	var theBox=currentPair.Mov.Mesh.geometry.boundingBox.clone();
	var distBox = currentPair.Mov.Mesh.geometry.boundingBox.clone()
	distBox.union(currentPair.Ref.Mesh.geometry.boundingBox);
	
	var theDist = Math.sqrt(Math.pow(distBox.max.x-distBox.min.x,2)+
							Math.pow(distBox.max.y-distBox.min.y,2)+
							Math.pow(distBox.max.y-distBox.min.y,2));
	
	var theDiv=theButton.parentElement;
	console.log(theDiv);
	theButton.onclick=function () {removeVectorView(this);};
	var theVecList=document.createElement("div");
	theVecList.id="vecList";
	var addButton=document.createElement("button");
	addButton.innerHTML="Add Vector";
	addButton.id="addButton";
	addButton.onclick=function () {addVectorToPair(this);};
	
	var pos=0;
	var lim=theVectors.length;
	var theEntry;
	var remBut;
	var xLab;
	var xInp;
	var yLab;
	var yInp;
	var zLabl;
	var zInp;
	while(pos<lim){
		theEntry=document.createElement("div");
		remBut=document.createElement("button");
		remBut.innerHTML="Remove";
		remBut.onclick=function () {remVectorFromPair(this);};
		xLab=document.createElement("text");
		xLab.innerHTML="X";
		xInp=document.createElement("input");
		xInp.type="number";
		xInp.step=0.01;
		xInp.value=(theVectors[pos].geometry.vertices[1].x-theVectors[pos].geometry.vertices[0].x)/theDist;
		xInp.onchange=function () {vecEntryUpdate(this);};
		yLab=document.createElement("text");
		yLab.innerHTML="Y";
		yInp=document.createElement("input");
		yInp.type="number";
		yInp.step=0.01;
		yInp.value=(theVectors[pos].geometry.vertices[1].y-theVectors[pos].geometry.vertices[0].y)/theDist;
		yInp.onchange=function () {vecEntryUpdate(this);};
		zLab=document.createElement("text");
		zLab.innerHTML="Z";
		zInp=document.createElement("input");
		zInp.type="number";
		zInp.step=0.01;
		zInp.value=(theVectors[pos].geometry.vertices[1].z-theVectors[pos].geometry.vertices[0].z)/theDist;
		zInp.onchange=function () {vecEntryUpdate(this);};
		
		theEntry.appendChild(xLab);
		theEntry.appendChild(xInp);
		theEntry.appendChild(document.createElement("br"));
		theEntry.appendChild(yLab);
		theEntry.appendChild(yInp);
		theEntry.appendChild(document.createElement("br"));
		theEntry.appendChild(zLab);
		theEntry.appendChild(zInp);
		theEntry.appendChild(document.createElement("br"));
		theEntry.appendChild(remBut);
		
		theEntry.counterPart=theVectors[pos];
		theEntry.className="vecEntry";
		
		theVecList.appendChild(theEntry);
		pos++;
	}
	
	theDiv.appendChild(addButton);
	theDiv.appendChild(theVecList);
	
}

function removeVectorView(theButton){
	
	console.log("doing removeVectorView");
	
	var theDiv=theButton.parentElement;
	var vecListHolder=document.getElementById("vecList");
	

	
	if(vecListHolder!=null){	
		var vecPos=0;
		var vecLim=theVectors.length;
		console.log(theVectors);
		
		var best;
		var ang;
		var testVector;
		currentPair.InfiniteDirections.length=0;
		while(vecPos<vecLim){
			testVector=new THREE.Vector3(1,1,1);
			//
			testVector.copy(theVectors[vecPos].geometry.vertices[1]);
			testVector.sub(theVectors[vecPos].geometry.vertices[0]);
			testVector.normalize();
			//console.log(testVector);
			pos=getDir(testVector);
			console.log(theVectors[vecPos]);
			if(theVectors[vecPos].material.color.r===1){
				currentPair.InfiniteDirections.push(pos);
				console.log("<--->");
			}
			
			console.log("Vector List Size is: ",theVectors.length);
			console.log("InfDir List Size is: ",currentPair.InfiniteDirections.length);
			vecPos++;
		}
		
		theDiv.removeChild(vecListHolder);
		theDiv.removeChild(document.getElementById("addButton"));
	}

	theButton.onclick=function () {insertVectorView(this);};
	
}

function addVectorToPair(theButton){
	
	console.log("doing addVectorToPair");
	
	var theDiv=theButton.parentElement;
	var theVecList=document.getElementById("vecList");
	console.log(theVecList);
	
	var theEntry=document.createElement("div");
	var remBut=document.createElement("button");
	remBut.innerHTML="Remove";
	remBut.onclick=function () {remVectorFromPair(this);};
	var xLab=document.createElement("text");
	xLab.innerHTML="X";
	var xInp=document.createElement("input");
	xInp.type="number";
	xInp.step=0.01;
	xInp.onchange=function () {vecEntryUpdate(this);};
	var yLab=document.createElement("text");
	yLab.innerHTML="Y";
	var yInp=document.createElement("input");
	yInp.type="number";
	yInp.step=0.01;
	yInp.onchange=function () {vecEntryUpdate(this);};
	var zLab=document.createElement("text");
	zLab.innerHTML="Z";
	var zInp=document.createElement("input");
	zInp.type="number";
	zInp.step=0.01;
	zInp.onchange=function () {vecEntryUpdate(this);};
	
	theEntry.appendChild(xLab);
	theEntry.appendChild(xInp);
	theEntry.appendChild(document.createElement("br"));
	theEntry.appendChild(yLab);
	theEntry.appendChild(yInp);
	theEntry.appendChild(document.createElement("br"));
	theEntry.appendChild(zLab);
	theEntry.appendChild(zInp);
	theEntry.appendChild(document.createElement("br"));
	theEntry.appendChild(remBut);
	
	theEntry.counterPart=null;
	theEntry.className="vecEntry";
	
	theVecList.appendChild(theEntry);
	
}


function remVectorFromPair(theButton){
	
	console.log("doing remVectorFromPair");
	if(theButton.parentElement.counterPart!=null){
		scene.remove(theButton.parentElement.counterPart);
	}
	
	console.log("The vector length before splice: ",theVectors.lenth);
	theVectors.splice(theVectors.indexOf(theButton.parentElement.counterPart),1);
	console.log("The vector length after splice: ",theVectors.lenth);
	
	theButton.parentElement.parentElement.removeChild(theButton.parentElement);
	
}

function vecEntryUpdate(theInput){
	
	console.log("doing vecEntryUpdate");
	
	var theBox=currentPair.Mov.Mesh.geometry.boundingBox.clone();
	
	currentPair.Ref.Mesh.geometry.computeBoundingBox();
	currentPair.Mov.Mesh.geometry.computeBoundingBox();
	var theBox=currentPair.Mov.Mesh.geometry.boundingBox.clone();
	var distBox = currentPair.Mov.Mesh.geometry.boundingBox.clone();
	distBox.union(currentPair.Ref.Mesh.geometry.boundingBox);
	
	var theDist = Math.sqrt(Math.pow(distBox.max.x-distBox.min.x,2)+
							Math.pow(distBox.max.y-distBox.min.y,2)+
							Math.pow(distBox.max.y-distBox.min.y,2));
							
	
	var theEntry=theInput.parentElement;
	var theInputs=theEntry.getElementsByTagName("INPUT");
	var pos=0;
	var lim=theInputs.length;
	var current;
	while(pos<lim){
		current=theInputs[pos];
		if(theInputs[pos].value===""){
			return;
		}
		pos++;
	}
	
	var theMag = Math.sqrt( Math.pow(parseFloat(theInputs[0].value),2)+
							Math.pow(parseFloat(theInputs[1].value),2)+
							Math.pow(parseFloat(theInputs[2].value),2));
	theInputs[0].value = theInputs[0].value/theMag;
	theInputs[1].value = theInputs[1].value/theMag;
	theInputs[2].value = theInputs[2].value/theMag;
	
	console.log(theInputs);
	if(theEntry.counterPart===null){
		var theVec = new THREE.Line(  new THREE.Geometry(),  new THREE.LineBasicMaterial({color: 0xff0000}));
		theVec.geometry.vertices[0]=new THREE.Vector3(
								  (theBox.min.x+theBox.max.x)/2,
								  (theBox.min.y+theBox.max.y)/2,
								  (theBox.min.z+theBox.max.z)/2
								 );
		theVec.geometry.vertices[1]=new THREE.Vector3(theVec.geometry.vertices[0].x+parseFloat(theInputs[0].value)*theDist,
													  theVec.geometry.vertices[0].y+parseFloat(theInputs[1].value)*theDist,
													  theVec.geometry.vertices[0].z+parseFloat(theInputs[2].value)*theDist);

													 

		scene.add(theVec);
		theVectors.push(theVec);
		console.log("theVectors Updated. New length is: ",theVectors.length);
		theVec.geometry.verticesNeedUpdate=true;
		theEntry.counterPart=theVec;
		theEntry.counterPart.geometry.verticesNeedUpdate=true;
	}
	else{
		var theVerts=theEntry.counterPart.geometry.vertices;
		theVerts[1].x=theVerts[0].x+parseFloat(theInputs[0].value)*theDist;
		theVerts[1].y=theVerts[0].y+parseFloat(theInputs[1].value)*theDist;
		theVerts[1].z=theVerts[0].z+parseFloat(theInputs[2].value)*theDist;
		theEntry.counterPart.geometry.verticesNeedUpdate=true;
	}
	console.log(theEntry.counterPart.geometry.vertices);
	
}


function getDir(theVec){
	
	var maxDot=-1;
	var theDot;
	var best=-1;
	var pos=0;
	var lim=theDirections.length;
	while(pos<lim){
		theDot=theDirections[pos].X*theVec.x+theDirections[pos].Y*theVec.y+theDirections[pos].Z*theVec.z;
		if(theDot>maxDot){
			maxDot=theDot;
			best=pos;
		}
		pos++;
	}
	return best;
	
}




function renderXML(){
	
	
	var start= "<?xml version='1.0' encoding='utf-8'?>\n"+
				"<DirectionSaveStructure xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance'>\n";
	var end= "</DirectionSaveStructure>\n";
	
	var dirContent= "<Directions>\n";
	var pos=0;
	var lim=theDirections.length;
	while(pos<lim){
		dirContent=dirContent+"<ArrayOfDouble>\n";
		dirContent=dirContent+"<double>"+theDirections[pos].X.toString()+"</double>\n";
		dirContent=dirContent+"<double>"+theDirections[pos].Y.toString()+"</double>\n";
		dirContent=dirContent+"<double>"+theDirections[pos].Z.toString()+"</double>\n";
		dirContent=dirContent+"</ArrayOfDouble>\n";
		pos++;
	}
	dirContent = dirContent + "</Directions>\n";
	
	
	var arcContent = "<arcs>\n";
	var idxPos;
	var idxLim;
	pos=0;
	lim=namePairs.length;
	while(pos<lim){
		arcContent = arcContent+"<arc xsi:type='Connection'>\n";
		arcContent = arcContent+"<name>"+namePairs[pos].name+"</name>\n";
		arcContent = arcContent+"<localLabels>"+namePairs[pos].localLabels+"</localLabels>\n";
		arcContent = arcContent+"<localVariables>"+namePairs[pos].localVariables+"</localVariables>\n";
		arcContent = arcContent+"<From>"+namePairs[pos].Mov+"</From>\n";
		arcContent = arcContent+"<To>"+namePairs[pos].Ref+"</To>\n";
		arcContent = arcContent+"<directed>"+namePairs[pos].Directed+"</directed>\n";
		arcContent = arcContent+"<doublyDirected>"+namePairs[pos].DoublyDirected+"</doublyDirected>\n";
		arcContent = arcContent+"<InfiniteDirections> \n";
		idxPos=0;
		idxLim=namePairs[pos].InfiniteDirections.length;
		while(idxPos<idxLim){
			arcContent = arcContent+"<int>"+namePairs[pos].InfiniteDirections[idxPos].toString()+"</int>\n";
			idxPos++;
		}
		arcContent = arcContent+"</InfiniteDirections>\n";
		arcContent = arcContent+"<FiniteDirections>"+namePairs[pos].FiniteDirections+"</FiniteDirections>\n";
		arcContent = arcContent+"<Fasteners>"+namePairs[pos].Fasteners+"</Fasteners>\n";
		arcContent = arcContent+"<Certainty>"+namePairs[pos].Certainty+"</Certainty>\n";
		arcContent = arcContent+"<ConnectionType>"+namePairs[pos].ConnectionType+"</ConnectionType>\n";
		
		arcContent = arcContent+"</arc>\n";
		pos++;
	}
	arcContent= arcContent + "</arcs>\n";
	
	var result = start + dirContent + arcContent + end;
	
	var data = new Blob([result], {type: 'text/plain'});

	if (textFile !== null) {
	  window.URL.revokeObjectURL(textFile);
	}

	textFile = window.URL.createObjectURL(data);

	document.getElementById("downloadLink").setAttribute("style","color: white; display: inline;");
	document.getElementById("downloadLink").innerHTML="Download";
	document.getElementById("downloadLink").href=textFile;
	
	
}




function initAxisLines(){
	
	theXAxis = new THREE.Line(  new THREE.Geometry(),  new THREE.LineBasicMaterial({color: 0xff0000, depthTest: false }));
	theXAxis.geometry.vertices.push(new THREE.Vector3(0,0,0));
	theXAxis.geometry.vertices.push(new THREE.Vector3(0,0,0));
	theXAxis.frustumCulled = false;
	
	theYAxis = new THREE.Line(  new THREE.Geometry(),  new THREE.LineBasicMaterial({color: 0x00ff00, depthTest: false }));
	theYAxis.geometry.vertices.push(new THREE.Vector3(0,0,0));
	theYAxis.geometry.vertices.push(new THREE.Vector3(0,0,0));
	theYAxis.frustumCulled = false;
	
	theZAxis = new THREE.Line(  new THREE.Geometry(),  new THREE.LineBasicMaterial({color: 0x0000ff, depthTest: false }));
	theZAxis.geometry.vertices.push(new THREE.Vector3(0,0,0));
	theZAxis.geometry.vertices.push(new THREE.Vector3(0,0,0));
	theZAxis.frustumCulled = false;
	
	
	scene.add(theXAxis);
	scene.add(theYAxis);
	scene.add(theZAxis);

	
}



function updateAxisLines(){
	
	var theRot= new THREE.Quaternion(0,0,0,0);
	theRot.setFromEuler(camera.rotation);
	var theDir= new THREE.Vector3(-3,-3,-5);
	
	theDir.applyQuaternion(theRot);

	
	var thePosition = camera.position.clone();
	
	thePosition.add(theDir);
	
	theXAxis.geometry.vertices[0].copy(thePosition);
	theXAxis.geometry.vertices[0].x-=0.5;
	theXAxis.geometry.vertices[1].copy(thePosition);
	theXAxis.geometry.vertices[1].x+=1;
	theXAxis.geometry.verticesNeedUpdate=true;
	
	theYAxis.geometry.vertices[0].copy(thePosition);
	theYAxis.geometry.vertices[0].y-=0.5;
	theYAxis.geometry.vertices[1].copy(thePosition);
	theYAxis.geometry.vertices[1].y+=1;
	theYAxis.geometry.verticesNeedUpdate=true;
	
	theZAxis.geometry.vertices[0].copy(thePosition);
	theZAxis.geometry.vertices[0].z-=0.5;
	theZAxis.geometry.vertices[1].copy(thePosition);
	theZAxis.geometry.vertices[1].z+=1;
	theZAxis.geometry.verticesNeedUpdate=true;
	

	
}





