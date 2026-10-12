export const universalActionFields = [
  {label:"Interaktiv-Sprache",key:"interactiveLocale",type:"select",refreshProperties:true,options:[{value:"auto",label:"Projektstandard"},{value:"de",label:"Deutsch"},{value:"en",label:"English"},{value:"fr",label:"Français"}]},
  {label:"Tasterverhalten",key:"buttonBehavior",type:"select",options:[{value:"cycle",label:"Nächster Zustand (bisher)"},{value:"fixed",label:"Fester Tastwert"}],showWhen:{key:"interaction",value:"button"}},
  {label:"Haltewert aktivieren",key:"holdEnabled",type:"checkbox",default:false,showWhen:{key:"interaction",value:"button"}},
  {label:"Haltewert",key:"holdValue",showWhen:{key:"holdEnabled",value:true}},
  {label:"Zielseite",key:"targetPage",type:"page"},
  {label:"Navigations-PIN (nur Bedienung)",key:"navigationPin",type:"password",showWhen:{key:"interaction",value:"navigation"}},
  {label:"Änderung pro Klick",key:"valueDelta",type:"number",default:1,showWhen:{key:"interaction",value:"adjust"}},
  {label:"Untergrenze",key:"adjustMin",type:"number",showWhen:{key:"interaction",value:"adjust"}},
  {label:"Obergrenze",key:"adjustMax",type:"number",showWhen:{key:"interaction",value:"adjust"}},
  {label:"HTTP-URL",key:"httpUrl",showWhen:{key:"interaction",value:"http"}},
  {label:"HTTP-Modus",key:"httpMode",type:"select",options:[{value:"fetch",label:"GET im Hintergrund"},{value:"tab",label:"Neuer Tab"},{value:"current",label:"Aktueller Tab"}],showWhen:{key:"interaction",value:"http"}},
];
export const universalDialogGroup={id:"ue-dialog",label:"Ansicht im Dialog",fields:[
  {label:"Dialogtitel",key:"dialogTitle"},
  {label:"Dialogbreite (px)",key:"dialogWidth",type:"number",min:100,max:4096,default:800},
  {label:"Dialoghöhe (px)",key:"dialogHeight",type:"number",min:100,max:4096,default:600},
  {label:"Dialog-Innenabstand (px)",key:"dialogPadding",type:"number",min:0,max:100,default:12},
  {label:"Dialog-Eckenradius (px)",key:"dialogRadius",type:"number",min:0,max:100,default:12},
  {label:"Dialogposition",key:"dialogPosition",type:"select",options:[{value:"center",label:"Mitte"},{value:"top",label:"Oben"},{value:"bottom",label:"Unten"}]},
  {label:"Dialog im Vollbild",key:"dialogFullscreen",type:"checkbox",default:false},
  {label:"Außenklick schließt Dialog",key:"dialogOutsideClose",type:"checkbox",default:false},
  {label:"Dialog automatisch schließen (s)",key:"dialogAutoClose",type:"number",min:0,max:86400,default:0},
]};
export const universalContentOptions=[{value:"view",label:"Eingebettete Ansicht"},{value:"colorpicker",label:"Farbwähler"},{value:"analogclock",label:"Analoguhr"}];
export const universalContentFields=[
  {label:"Inhaltsseite",key:"contentPage",type:"page",showWhen:{key:"contentType",value:"view"}},
  {label:"Ansicht einpassen",key:"viewScaleToFit",type:"checkbox",default:false,showWhen:{key:"contentType",value:"view"}},
  {label:"Farb-Entität",key:"colorEntityId",universalEntity:true,showWhen:{key:"contentType",value:"colorpicker"}},
  {label:"Farbformat",key:"colorFormat",type:"select",options:["hex","hex8","rgb","hsl","hsv","cie"],showWhen:{key:"contentType",value:"colorpicker"}},
  {label:"Farbmodell",key:"colorControl",type:"select",options:[{value:"box",label:"Farbfläche"},{value:"wheel",label:"Farbkreis"}],showWhen:{key:"contentType",value:"colorpicker"}},
  {label:"Farbregler",key:"colorSliders",type:"checkbox",default:false,showWhen:{key:"contentType",value:"colorpicker"}},
  {label:"Alpha anzeigen",key:"colorAlpha",type:"checkbox",default:false,showWhen:{key:"contentType",value:"colorpicker"}},
  {label:"Kelvin anzeigen",key:"colorKelvin",type:"checkbox",default:false,showWhen:{key:"contentType",value:"colorpicker"}},
  {label:"Uhrziffern anzeigen",key:"clockNumbers",type:"checkbox",default:true,showWhen:{key:"contentType",value:"analogclock"}},
  {label:"Sekundenzeiger anzeigen",key:"clockSeconds",type:"checkbox",default:true,showWhen:{key:"contentType",value:"analogclock"}},
  {label:"Uhrblattfarbe",key:"clockFace",type:"color",optionalColor:true,showWhen:{key:"contentType",value:"analogclock"}},
  {label:"Zeigerfarbe",key:"clockHands",type:"color",optionalColor:true,showWhen:{key:"contentType",value:"analogclock"}},
];
