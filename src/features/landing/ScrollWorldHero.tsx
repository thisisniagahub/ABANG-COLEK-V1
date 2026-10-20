import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from 'react';
import { ArrowDown, ArrowRight, ArrowUpRight, Box, CirclePause, CirclePlay, Citrus, Flame, ShoppingBag, Truck, User, Users } from 'lucide-react';
import { storyModeScrollTarget, storyModeSnapshot, type StoryViewportSnapshot } from './story-model';
import { useSceneController } from './useSceneController';
import WorldHotspot from './WorldHotspot';
import { BRAND_ASSETS } from '../brand/brand-assets';
import './scroll-world.css';

const worldScenes = BRAND_ASSETS.worldScenes;
const FILM_URL = '/assets/world/film.mp4';
const FILM_POSTER = '/assets/world/scene-6-hero.webp';
const FILM_SECTIONS: ReadonlyArray<{ start: number; end: number }> = [
  { start: 0.7, end: 6.8 },
  { start: 7.7, end: 13.8 },
  { start: 14.7, end: 20.8 },
  { start: 21.7, end: 27.8 },
  { start: 28.7, end: 34.8 },
  { start: 35.7, end: 41.8 },
];
const chapters = [
  { id: 'dunia', label: 'Dunia', icon: Flame, eyebrow: '01 / Masuk dunia colek', title: ['Dunia', 'ABANGCOLEK.'], accentLine: 1, description: 'Colek buah, jeruk dan sambal — dibuat dengan tangan, dijaga dengan kualiti. Selamat datang ke dunia kami.', action: 'Jom pilih produk', path: '/products', detail: 'Packaging dan produk dipaparkan daripada katalog yang disahkan.' },
  { id: 'pilih', label: 'Pilih buah', icon: Citrus, eyebrow: '02 / Pilih buah anda', title: ['Pilih buah', 'anda.'], accentLine: 1, description: 'Varian daripada katalog aktif — nama, harga dan stok sentiasa dari data semasa, bukan tangkapan media sosial.', action: 'Lihat katalog', path: '/products', detail: 'Ketersediaan mengikut katalog yang disahkan.' },
  { id: 'rasa', label: 'Rasa & reaksi', icon: Users, eyebrow: '03 / Rasa & reaksi', title: ['Rasa sekali,', 'jatuh cinta.'], accentLine: 1, description: 'Tekstur kuah colek yang likat melekat dan reaksi pelanggan sebenar — bukti rasa yang boleh disemak sumbernya.', action: 'Lihat katalog', path: '/products', detail: 'Media pelanggan digunakan dengan attribution dan kebenaran owner.' },
  { id: 'founder', label: 'Founder', icon: User, eyebrow: '04 / Kenal founder', title: ['Kenal', 'founder.'], accentLine: 1, description: 'Di sebalik setiap cawan ada pemilik yang menjual, memasak dan melayan komuniti — Founder | Motivator.', action: 'Ikuti di TikTok', path: 'https://www.tiktok.com/@styloairpool', detail: 'Nama dan cerita founder dipaparkan hanya dengan kelulusan founder.' },
  { id: 'jerux', label: 'Dapatkan', icon: Truck, eyebrow: '05 / Dapatkan Jerux anda', title: ['Dapatkan', 'Jerux anda.'], accentLine: 1, description: 'Pra-tempahan dan made-to-order mengikut rekod yang disahkan — pickup di lokasi disahkan atau ikut update dispatch.', action: 'Lihat lokasi pickup', path: '/locations', detail: 'Order melalui flow pesanan yang sama; status datang dari server.' },
  { id: 'pesanan', label: 'Pesanan', icon: ShoppingBag, eyebrow: '06 / Pilihan & pesanan', title: ['Pilihan', '& pesanan.'], accentLine: 1, description: 'Lineup aktif dari katalog — pilih, pesan dan jejak dalam satu aliran. Ejen dan stokis mempunyai laluan berasingan.', action: 'Pesan sekarang', path: '/products', detail: 'Pendaftaran ejen ialah laluan berasingan daripada pembelian.' },
] as const;
const SHORT_VIEWPORT_QUERY = '(max-height: 560px), (max-width: 750px) and (max-height: 740px)';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
// Chapter → world-asset mapping (scene content verified visually): dunia→hero, pilih→dapur, rasa→komuniti, founder→qc, jerux→dispatch, pesanan→stokis.
const CHAPTER_ASSETS = [5, 0, 4, 1, 3, 2] as const;
interface ModeChangeSnapshot extends StoryViewportSnapshot { viewportWidth: number; chapter: number; manual: boolean; }

export default function ScrollWorldHero({ onNavigate }: { onNavigate: (path: string) => void }) {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const filmRef = useRef<HTMLVideoElement>(null);
  const [motionPaused, setMotionPaused] = useState(false);
  const [shortViewport, setShortViewport] = useState(() => window.matchMedia(SHORT_VIEWPORT_QUERY).matches);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia(REDUCED_MOTION_QUERY).matches);
  const [failedScenes, setFailedScenes] = useState<ReadonlySet<string>>(() => new Set());
  const [filmFailed, setFilmFailed] = useState(false);
  const [hotspotOpen, setHotspotOpen] = useState(false);
  const handlePlaybackError = (error: unknown) => {
    if (error instanceof Error && ['NotAllowedError', 'NotSupportedError'].includes(error.name)) setFilmFailed(true);
  };
  const scenesAvailable = failedScenes.size < worldScenes.length;
  const staticMode = Boolean(reducedMotion || motionPaused || shortViewport);
  const filmMode = scenesAvailable && !filmFailed && !staticMode;
  const { active, phase, direction, visible, selectScene, releaseScene } = useSceneController({ sectionRef, enabled: !staticMode, blocked: hotspotOpen, sceneCount: chapters.length });
  const productPhotoVisible = !staticMode && active === chapters.length - 1;
  const modeRef = useRef({ staticMode, motionPaused, active });
  modeRef.current = { staticMode, motionPaused, active };
  const modeChangeRef = useRef<ModeChangeSnapshot | null>(null);
  const settledViewportRef = useRef<ModeChangeSnapshot | null>(null);

  useEffect(() => {
    const video = filmRef.current;
    if (!filmMode || !video) return;
    const section = FILM_SECTIONS[CHAPTER_ASSETS[active]];
    let loopHandler: (() => void) | null = null;
    const startLoop = () => {
      loopHandler = () => {
        if (video.currentTime >= section.end) video.currentTime = section.start;
      };
      video.addEventListener('timeupdate', loopHandler);
      if (visible && !hotspotOpen && video.paused) video.play().catch(handlePlaybackError);
    };
    const move = () => {
      // The chapter order differs from the film's original edit. Its transition
      // clips belong to the original adjacent scenes, so seek to this chapter.
      video.currentTime = section.start;
      startLoop();
    };
    if (video.readyState >= 1) move();
    else video.addEventListener('loadedmetadata', move, { once: true });
    return () => {
      if (loopHandler) video.removeEventListener('timeupdate', loopHandler);
      video.removeEventListener('loadedmetadata', move);
    };
  }, [active, filmMode, visible, hotspotOpen]);

  useEffect(() => {
    const video = filmRef.current;
    if (!video || filmFailed) return;
    if (filmMode && visible && !hotspotOpen) video.play().catch(handlePlaybackError);
    else video.pause();
  }, [filmMode, visible, hotspotOpen, filmFailed]);

  const readViewportSnapshot = (manual = false): ModeChangeSnapshot | null => {
    const section = sectionRef.current;
    if (!section) return null;
    const rect = section.getBoundingClientRect();
    const stickyTop = Number.parseFloat(getComputedStyle(section).getPropertyValue('--ac-world-header')) || 0;
    const visibleChapter = Array.from(section.querySelectorAll<HTMLElement>('.ac-world-copy')).findIndex(article => {
      const bounds = article.getBoundingClientRect();
      return bounds.bottom > stickyTop && bounds.top < window.innerHeight;
    });
    return { sectionTop: rect.top, sectionHeight: rect.height, viewportHeight: window.innerHeight, viewportWidth: window.innerWidth, stickyTop, manual, chapter: modeRef.current.staticMode ? Math.max(0, visibleChapter) : modeRef.current.active };
  };
  const captureModeChange = (manual: boolean) => {
    const current = readViewportSnapshot(manual);
    if (current) modeChangeRef.current = manual ? current : storyModeSnapshot(settledViewportRef.current, current);
  };

  useEffect(() => {
    const query = window.matchMedia(SHORT_VIEWPORT_QUERY);
    const reducedQuery = window.matchMedia(REDUCED_MOTION_QUERY);
    const update = () => {
      const nextStaticMode = Boolean(query.matches || reducedQuery.matches || modeRef.current.motionPaused);
      if (nextStaticMode !== modeRef.current.staticMode) captureModeChange(false);
      setShortViewport(query.matches);
      setReducedMotion(reducedQuery.matches);
    };
    update();
    query.addEventListener('change', update);
    reducedQuery.addEventListener('change', update);
    return () => { query.removeEventListener('change', update); reducedQuery.removeEventListener('change', update); };
  }, []);

  useLayoutEffect(() => {
    const before = modeChangeRef.current;
    const section = sectionRef.current;
    if (!before || !section) return;
    modeChangeRef.current = null;
    const rect = section.getBoundingClientRect();
    const documentTop = rect.top + window.scrollY;
    const header = Number.parseFloat(getComputedStyle(section).getPropertyValue('--ac-world-header')) || 0;
    const chapter = section.querySelector<HTMLElement>(`#world-${chapters[before.chapter].id}`);
    const target = staticMode && chapter ? chapter.getBoundingClientRect().top + window.scrollY - header : documentTop - header;
    const top = storyModeScrollTarget(before, documentTop + rect.height, target);
    if (top !== null) window.scrollTo({ top, behavior: 'auto' });
    if (!staticMode) selectScene(before.chapter);
    if (before.manual) {
      if (staticMode) chapter?.focus({ preventScroll: true });
      else stageRef.current?.querySelector<HTMLButtonElement>('.ac-world-motion')?.focus({ preventScroll: true });
    }
  }, [staticMode, selectScene]);

  useLayoutEffect(() => {
    let frame: number | null = null;
    const update = () => {
      frame = null;
      const nextStatic = Boolean(window.matchMedia(SHORT_VIEWPORT_QUERY).matches || window.matchMedia(REDUCED_MOTION_QUERY).matches || modeRef.current.motionPaused);
      if (nextStatic === modeRef.current.staticMode) settledViewportRef.current = readViewportSnapshot();
    };
    const schedule = () => { if (frame === null) frame = window.requestAnimationFrame(update); };
    const observer = new ResizeObserver(schedule);
    if (sectionRef.current) observer.observe(sectionRef.current);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    update();
    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [active, staticMode]);

  const goToChapter = (index: number) => {
    const section = sectionRef.current;
    if (!section) return;
    const header = Number.parseFloat(getComputedStyle(section).getPropertyValue('--ac-world-header')) || 0;
    window.scrollTo({ top: Math.max(0, section.getBoundingClientRect().top + window.scrollY - header), behavior: 'auto' });
    selectScene(index);
  };
  const skipToCatalogue = (event: MouseEvent<HTMLAnchorElement>) => {
    const catalogue = document.getElementById('catalogue');
    if (!catalogue) return;
    event.preventDefault();
    releaseScene();
    catalogue.scrollIntoView({ behavior: 'auto', block: 'start' });
    catalogue.focus({ preventScroll: true });
  };
  const markSceneFailed = (id: string) => {
    setFailedScenes(current => {
      if (current.has(id)) return current;
      const next = new Set(current);
      next.add(id);
      return next;
    });
  };

  return <section ref={sectionRef} className={`ac-world-journey${staticMode ? ' is-static' : ''}`} tabIndex={staticMode ? undefined : 0} aria-label="Terokai dunia ABANGCOLEK" aria-describedby={staticMode ? undefined : 'ac-world-instructions'} data-scene={chapters[active].id} data-motion={staticMode ? 'static' : 'scene'} data-phase={staticMode ? 'idle' : phase} data-direction={direction}>
    <div ref={stageRef} className="ac-world-stage">
      <div className={`ac-world-visual${filmMode ? ' is-film' : scenesAvailable ? ' is-journey' : ' asset-fallback'}`} aria-hidden="true">
        {filmMode ? <video ref={filmRef} className="ac-world-film" src={FILM_URL} poster={FILM_POSTER} muted playsInline autoPlay preload="auto" onError={() => setFilmFailed(true)} /> : scenesAvailable ? CHAPTER_ASSETS.map((assetIndex, chapterIndex) => { const scene = worldScenes[assetIndex]; return <img key={scene.id} className={`ac-world-scene${chapterIndex === active ? ' is-active' : ''}`} data-scene={scene.id} src={failedScenes.has(scene.id) ? BRAND_ASSETS.world.src : scene.src} alt="" width={scene.width} height={scene.height} loading={chapterIndex === 0 ? 'eager' : 'lazy'} decoding="async" onError={() => markSceneFailed(scene.id)} />; }) : <img key="fallback" className="ac-world-camera" src={BRAND_ASSETS.world.src} alt="" width={BRAND_ASSETS.world.width} height={BRAND_ASSETS.world.height} decoding="async" />}
      </div>
      <div className="ac-world-shade" aria-hidden="true" />
      {/* A native touch keeps its starting target until touchend; retain this node across scenes. */}
      {!staticMode && <figure className="ac-world-product-photo" aria-hidden={!productPhotoVisible}>
        <div><img src={BRAND_ASSETS.productEditorial.src} alt={BRAND_ASSETS.productEditorial.alt} width={405} height={720} decoding="async" fetchPriority="high" /></div>
        <figcaption><strong>Sambal Colek</strong><a href={BRAND_ASSETS.productEditorial.source} inert={!productPhotoVisible} tabIndex={productPhotoVisible ? undefined : -1} target="_blank" rel="noopener noreferrer">Foto TikTok rasmi <ArrowUpRight size={12} /></a></figcaption>
      </figure>}
      <div className="ac-world-topline">
        <span className="ac-world-edition"><Box size={15} /> THE ABANGCOLEK WORLD</span>
        <button className="ac-world-motion" onClick={() => { captureModeChange(true); setMotionPaused(value => !value); }} aria-pressed={motionPaused} disabled={Boolean(reducedMotion || shortViewport)} aria-label={motionPaused ? 'Aktifkan animasi dunia' : staticMode ? 'Paparan tanpa animasi' : 'Kurangkan animasi'}>
          {staticMode ? <CirclePlay size={17} /> : <CirclePause size={17} />}<span>{staticMode ? 'Paparan statik' : 'Kurangkan animasi'}</span>
        </button>
      </div>
      <div className="ac-world-scenes">
        {chapters.map((chapter, index) => <article key={chapter.id} id={`world-${chapter.id}`} tabIndex={-1} className={`ac-world-copy${index === active ? ' is-active' : ''}`} aria-hidden={!staticMode && index !== active} inert={!staticMode && index !== active}>
          <p className="ac-world-eyebrow"><span />{chapter.eyebrow}</p>
          {index === 0 ? <h1>{chapter.title.map((line, lineIndex) => <span key={line} className={lineIndex === chapter.accentLine ? 'ac-world-accent' : ''}>{line}</span>)}</h1> : <h2>{chapter.title.map(line => <span key={line}>{line}</span>)}</h2>}
          <p className="ac-world-description">{chapter.description}</p>
          <div className="ac-world-actions">
            {chapter.path.startsWith('http') ? <a className="ac-button" href={chapter.path} target="_blank" rel="noopener noreferrer">{chapter.action}<ArrowUpRight size={18} /></a> : <button className="ac-button" onClick={() => onNavigate(chapter.path)}>{chapter.action}<ArrowUpRight size={18} /></button>}
            {index === chapters.length - 1 && <button className="ac-world-secondary" onClick={() => onNavigate('/become-dealer')}>Jadi rakan bisnes <ArrowRight size={16} /></button>}
          </div>
          <p className="ac-world-detail"><chapter.icon size={15} />{chapter.detail}</p>
          {index === chapters.length - 1 && staticMode && <a className="ac-world-static-product" href={BRAND_ASSETS.productEditorial.source} target="_blank" rel="noopener noreferrer"><img src={BRAND_ASSETS.productEditorial.src} alt={BRAND_ASSETS.productEditorial.alt} width={405} height={720} loading="lazy" /><span>Sambal Colek · Foto TikTok rasmi <ArrowUpRight size={14} /></span></a>}
        </article>)}
      </div>
      {!staticMode && <WorldHotspot active={active} paused={!visible || hotspotOpen} onOpenChange={setHotspotOpen} onNavigate={onNavigate} />}
      <span className="ac-world-art-note">Ilustrasi perjalanan ABANGCOLEK</span>
      <div className="ac-world-bottom">
        {!staticMode && <nav className="ac-world-chapters" aria-label="Bab perjalanan ABANGCOLEK">
          {chapters.map((chapter, index) => <button key={chapter.id} aria-label={`Bab ${index + 1}: ${chapter.label}`} aria-current={index === active ? 'step' : undefined} onClick={() => goToChapter(index)}>
            <span className="ac-world-chapter-number">0{index + 1}</span><chapter.icon size={18} /><span>{chapter.label}</span>
          </button>)}
          <div className="ac-world-progress" aria-hidden="true"><span style={{ transform: `scaleX(${(active + 1) / chapters.length})` }} /></div>
        </nav>}
        <a className="ac-world-skip" href="#catalogue" onClick={skipToCatalogue}>Terus ke katalog <ArrowDown size={16} /></a>
      </div>
      {!staticMode && <p id="ac-world-instructions" className="ac-world-scroll-hint">{active === chapters.length - 1 ? 'SCROLL UNTUK TERUSKAN' : 'SCROLL / SWIPE UNTUK TEROKAI'}<ArrowDown size={15} /><span className="ac-world-sr-only">Gunakan PageDown atau PageUp apabila fokus pada ruang ini. Butang bab dan pautan terus ke katalog juga tersedia.</span></p>}
      <span className="ac-world-sr-only" role="status" aria-live="polite" aria-atomic="true">{!staticMode ? `Bab ${active + 1} daripada ${chapters.length}: ${chapters[active].label}` : 'Paparan statik. Semua bab boleh dibaca.'}</span>
    </div>
  </section>;
}
