import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

document.title = "SnapThePlant - Plant Care Made Simple";

// Add Google Fonts for our custom typography
const linkFont = document.createElement("link");
linkFont.rel = "preconnect";
linkFont.href = "https://fonts.googleapis.com";
document.head.appendChild(linkFont);

const linkGstatic = document.createElement("link");
linkGstatic.rel = "preconnect";
linkGstatic.href = "https://fonts.gstatic.com";
linkGstatic.crossOrigin = "";
document.head.appendChild(linkGstatic);

const linkGoogleFonts = document.createElement("link");
linkGoogleFonts.rel = "stylesheet";
linkGoogleFonts.href = "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,500;0,700;1,500&display=swap";
document.head.appendChild(linkGoogleFonts);

// Add Material Icons
const linkMaterialIcons = document.createElement("link");
linkMaterialIcons.rel = "stylesheet";
linkMaterialIcons.href = "https://fonts.googleapis.com/icon?family=Material+Icons";
document.head.appendChild(linkMaterialIcons);

createRoot(document.getElementById("root")!).render(<App />);
