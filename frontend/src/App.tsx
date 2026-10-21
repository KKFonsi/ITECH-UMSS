import { UMSS } from "./components/umss/UMSS";

/**
 * Root app component.
 * The UMSS component manages all internal routing via its own screen-state
 * machine (login → student-dashboard → … etc.), so no external router is needed
 * at this layer.  When you add more top-level pages (landing, about, admin SPA)
 * swap this out for react-router-dom.
 */
function app()  {
  return <UMSS />
}

export default UMSS;
