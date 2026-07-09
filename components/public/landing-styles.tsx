/**
 * Styles globaux partagés par la landing et les sous-pages publiques :
 * halos ambiants, reveals au scroll (pilotés par React via qb-in/qb-pre) et
 * le reflet animé des CTA. Rendu une seule fois par page.
 */
export function LandingStyles() {
  // dangerouslySetInnerHTML (contenu statique) : en enfant texte, React
  // echapperait les apostrophes du content:'' en SSR, d ou un hydration
  // mismatch qui bascule toute la page en rendu client.
  return (
    <style dangerouslySetInnerHTML={{ __html: `
      @keyframes qbGlow { 0%,100%{opacity:.55} 50%{opacity:1} }
      .qb-glow { animation-name: qbGlow; animation-timing-function: ease-in-out; animation-iteration-count: infinite; }

      /* ── Reveal au scroll (piloté par React via qb-in/qb-pre) ───────── */
      .qb-reveal { transition: opacity .7s cubic-bezier(.2,.7,.2,1), transform .7s cubic-bezier(.2,.7,.2,1); }
      .qb-reveal.qb-pre { opacity: 0; transform: translateY(26px); }
      .qb-reveal.qb-in  { opacity: 1; transform: none; }
      .qb-stagger { transition: opacity .55s cubic-bezier(.2,.7,.2,1), transform .55s cubic-bezier(.2,.7,.2,1); }
      .qb-pre .qb-stagger { opacity: 0; transform: translateY(16px); }
      .qb-in  .qb-stagger { opacity: 1; transform: none; }
      .qb-line { transform: scaleX(0); transform-origin: left center; transition: transform 1.1s cubic-bezier(.65,0,.35,1); }
      .qb-in .qb-line { transform: scaleX(1); }
      .qb-step { opacity: 0; transform: translateY(18px) scale(.94); transition: opacity .55s cubic-bezier(.2,.7,.2,1), transform .55s cubic-bezier(.2,.7,.2,1); }
      .qb-in .qb-step { opacity: 1; transform: none; }

      /* ── CTA violet : reflet qui balaie + lift au hover ─────────────── */
      @keyframes qbShine { 0%{transform:translateX(-120%)} 60%,100%{transform:translateX(220%)} }
      .qb-cta-shine { transition: transform .2s ease, box-shadow .2s ease; }
      .qb-cta-shine:hover { transform: translateY(-2px); box-shadow: 0 14px 38px rgba(108,99,255,0.6); }
      .qb-cta-shine:hover svg { transform: translateX(3px); }
      .qb-cta-shine svg { transition: transform .2s ease; }
      .qb-cta-shine::before { content:''; position:absolute; top:0; left:0; width:40%; height:100%; background:linear-gradient(100deg,transparent,rgba(255,255,255,0.35),transparent); transform:translateX(-120%); animation:qbShine 4.5s ease-in-out infinite; z-index:0; }

      @media (prefers-reduced-motion: reduce) {
        .qb-glow { animation: none; }
        .qb-cta-shine::before { animation: none; opacity: 0; }
        .qb-reveal, .qb-stagger, .qb-step { transition: none !important; }
        .qb-reveal.qb-pre, .qb-pre .qb-stagger, .qb-step { opacity: 1 !important; transform: none !important; }
        .qb-line { transition: none !important; transform: scaleX(1) !important; }
      }
    ` }} />
  )
}
