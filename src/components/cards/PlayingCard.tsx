import { useLayoutEffect, useRef } from 'react';
import { animate, motion } from 'framer-motion';
import { cardLabel, type Card } from '../../engine/cards';
import { CardBack, CardFace } from './CardFace';
import { dur } from '../../store/settings';
import { anchors } from '../table/anchors';

interface Props {
  card?: Card | null;
  faceDown?: boolean;
  /** Anime l'arrivée depuis le sabot au montage. */
  dealt?: boolean;
  delay?: number;
  className?: string;
  /** Légère rotation pour un rendu naturel. */
  tilt?: number;
  dimmed?: boolean;
  highlight?: boolean;
}

/**
 * Carte à jouer SVG. Largeur pilotée par la variable CSS --card-w.
 * Arrivée animée depuis le sabot, retournement 3D quand faceDown change.
 */
export function PlayingCard({ card, faceDown = false, dealt = true, delay = 0, className = '', tilt = 0, dimmed, highlight }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el || !dealt) return;
    const d = dur(0.42);
    if (d === 0) return;
    const shoe = anchors.shoe?.getBoundingClientRect();
    const me = el.getBoundingClientRect();
    const dx = shoe ? shoe.left + shoe.width / 2 - (me.left + me.width / 2) : 220;
    const dy = shoe ? shoe.top + shoe.height / 2 - (me.top + me.height / 2) : -260;
    el.style.opacity = '0';
    const controls = animate(
      el,
      { x: [dx, 0], y: [dy, 0], rotate: [-28, 0], scale: [0.72, 1], opacity: [1, 1] },
      { duration: d, delay, ease: [0.22, 1, 0.36, 1] },
    );
    return () => controls.stop();
    // On n'anime qu'au montage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const label = !card || faceDown ? 'Carte face cachée' : cardLabel(card);

  return (
    <div
      ref={wrapRef}
      role="img"
      aria-label={label}
      className={`relative shrink-0 ${className}`}
      style={{
        width: 'var(--card-w)',
        aspectRatio: '250 / 350',
      }}
    >
      <div className="absolute inset-0" style={{ perspective: '900px', transform: tilt ? `rotate(${tilt}deg)` : undefined }}>
      <motion.div
        className="absolute inset-0"
        style={{ transformStyle: 'preserve-3d' }}
        initial={false}
        animate={{ rotateY: faceDown || !card ? 180 : 0 }}
        transition={{ duration: dur(0.5), ease: [0.22, 1, 0.36, 1] }}
      >
        <div
          className="absolute inset-0 rounded-[9%] card-shadow"
          style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
        >
          {card && <CardFace rank={card.rank} suit={card.suit} />}
        </div>
        <div
          className="absolute inset-0 rounded-[9%] card-shadow"
          style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <CardBack />
        </div>
      </motion.div>
      </div>
      {dimmed && <div className="pointer-events-none absolute inset-0 rounded-[9%] bg-bg-1/55" />}
      {highlight && (
        <div className="pointer-events-none absolute -inset-1 rounded-[10%] ring-2 ring-accent shadow-[0_0_24px_rgba(31,224,122,0.4)]" />
      )}
    </div>
  );
}
