import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ArrowUpRight, ChevronDown, Menu, Pause, Play, Search, X } from "lucide-react";

type HeroSlide = {
  id: string;
  selector: string;
  heading: string;
  description: string;
};

type NavigationItem = {
  label: string;
  href: string;
  external?: boolean;
};

export interface EmonsHeroNavigationProps {
  /** Supply the authorized MP4 URL; signed query values are deliberately not bundled. */
  videoSrc?: string;
  /** Override the local official wordmark asset path when integrating elsewhere. */
  logoSrc?: string;
  /** Override any route if the destination site uses different locale routes. */
  navigationItems?: NavigationItem[];
  freightInquiryHref?: string;
  searchAction?: string;
}

const HERO_SLIDES: HeroSlide[] = [
  {
    id: "road",
    selector: "01 Road",
    heading: "Road",
    description:
      "More than 1,000 vehicles in use — Emons drives for customers across Europe and Asia every day.",
  },
  {
    id: "logistics",
    selector: "02 Logistics",
    heading: "Our logistics facilities",
    description:
      "With digital tools and smart warehouse solutions, Emons ensures efficient supply along the entire value chain — even with complex requirements.",
  },
  {
    id: "air-sea",
    selector: "03 Air & Sea",
    heading: "Customs",
    description:
      "With AEO certification, digital interfaces and in-house advice, Emons is ideally prepared for international trade in goods.",
  },
  {
    id: "rail",
    selector: "04 Rail",
    heading: "Rail Cargo",
    description:
      "With daily departures, its own wagons and terminals, Emons consolidates goods on dedicated rail connections and shifts suitable freight from road to rail.",
  },
  {
    id: "digital",
    selector: "05 Digital",
    heading: "Headquarters",
    description:
      "From here, we manage, design and think — the heart of an internationally growing family business.",
  },
];

const DEFAULT_NAVIGATION: NavigationItem[] = [
  { label: "Services", href: "/en/leistungen" },
  { label: "Customer Area", href: "/en/cargointernational" },
  { label: "Company", href: "/en/portrait" },
  { label: "Contact", href: "/en/kontakt" },
  { label: "Careers", href: "https://emons-career.com/", external: true },
];

const HERO_POSTER =
  "https://cdn.prod.website-files.com/66c856a2e1e5dc372a191eaa/687f8a88fe4d8f598c4109ed_Emons%203D%20Animation_250416_Thumbnail.webp";

export function EmonsHeroNavigation({
  videoSrc,
  logoSrc = "/assets/emons-logo.svg",
  navigationItems = DEFAULT_NAVIGATION,
  freightInquiryHref = "/en/frachtanfrage",
  searchAction = "/en/search",
}: EmonsHeroNavigationProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [motionAllowed, setMotionAllowed] = useState(false);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotionPreference = () => {
      const allowed = !preference.matches;
      setMotionAllowed(allowed);
      setVideoPlaying(Boolean(videoSrc) && allowed);
    };
    syncMotionPreference();
    preference.addEventListener("change", syncMotionPreference);
    return () => preference.removeEventListener("change", syncMotionPreference);
  }, [videoSrc]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!videoPlaying || !motionAllowed) {
      video.pause();
      return;
    }
    void video.play().catch(() => setVideoPlaying(false));
  }, [videoPlaying, motionAllowed, videoSrc]);

  const selectTab = (index: number) => setActiveIndex(index);

  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    let nextIndex: number | undefined;
    if (event.key === "ArrowRight") nextIndex = (activeIndex + 1) % HERO_SLIDES.length;
    if (event.key === "ArrowLeft") nextIndex = (activeIndex - 1 + HERO_SLIDES.length) % HERO_SLIDES.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = HERO_SLIDES.length - 1;
    if (nextIndex === undefined) return;
    event.preventDefault();
    setActiveIndex(nextIndex);
    tabRefs.current[nextIndex]?.focus();
  };

  return (
    <div className="emons-hero-navigation min-h-screen bg-white text-[#242424] antialiased">
      <a
        href="#emons-main"
        className="sr-only z-[100] rounded bg-white px-4 py-3 text-[#242424] focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:ring-2 focus:ring-[#c8102e]"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-black/5 bg-white">
        <nav aria-label="Primary navigation" className="mx-auto flex h-[76px] max-w-[1600px] items-center justify-between gap-6 px-5 sm:px-8 lg:px-12">
          <a href="/en" aria-label="Emons home" className="flex shrink-0 items-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c8102e]">
            <img src={logoSrc} width="156" height="48" alt="Emons" className="h-10 w-auto object-contain" />
          </a>

          <div className="hidden items-center gap-5 lg:flex xl:gap-8">
            {navigationItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                target={item.external ? "_blank" : undefined}
                rel={item.external ? "noreferrer" : undefined}
                className="rounded-sm text-[15px] font-medium transition-colors hover:text-[#c8102e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c8102e] focus-visible:ring-offset-4 motion-reduce:transition-none"
              >
                {item.label}
                {item.external && <span className="sr-only"> (opens in a new tab)</span>}
              </a>
            ))}
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <button
              type="button"
              aria-label={searchOpen ? "Close search" : "Open search"}
              aria-expanded={searchOpen}
              onClick={() => setSearchOpen((open) => !open)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c8102e]"
            >
              {searchOpen ? <X aria-hidden="true" size={20} /> : <Search aria-hidden="true" size={20} />}
            </button>

            <div className="relative hidden sm:block">
              <button
                type="button"
                aria-label="Choose language; current language English"
                aria-expanded={languageOpen}
                onClick={() => setLanguageOpen((open) => !open)}
                className="inline-flex h-11 items-center gap-1 rounded px-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c8102e]"
              >
                EN <ChevronDown aria-hidden="true" size={15} />
              </button>
              {languageOpen && (
                <div className="absolute right-0 top-full mt-2 min-w-36 rounded-md border border-black/10 bg-white p-2 shadow-xl" role="group" aria-label="Available languages">
                  <a href="/en" lang="en" aria-current="page" className="block rounded px-3 py-2 text-sm hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c8102e]">English</a>
                  <a href="/" lang="de" className="block rounded px-3 py-2 text-sm hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c8102e]">Deutsch</a>
                </div>
              )}
            </div>

            <a
              href={freightInquiryHref}
              className="hidden min-h-11 items-center gap-2 rounded-sm bg-[#c8102e] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#a90d27] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c8102e] focus-visible:ring-offset-2 sm:inline-flex sm:px-5"
            >
              Freight inquiry <ArrowUpRight aria-hidden="true" size={16} />
            </a>

            <button
              type="button"
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileMenuOpen}
              aria-controls="emons-mobile-navigation"
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c8102e] lg:hidden"
            >
              {mobileMenuOpen ? <X aria-hidden="true" size={22} /> : <Menu aria-hidden="true" size={22} />}
            </button>
          </div>
        </nav>

        {searchOpen && (
          <form role="search" action={searchAction} method="get" className="border-t border-black/5 bg-white px-5 py-4 sm:px-8 lg:px-12">
            <label htmlFor="emons-search" className="sr-only">Enter search term</label>
            <div className="mx-auto flex max-w-5xl gap-3">
              <input id="emons-search" name="q" type="search" autoFocus placeholder="Enter search term" className="min-h-12 flex-1 border-b border-black/30 bg-transparent px-2 text-base outline-none focus:border-[#c8102e] focus:ring-0" />
              <button type="submit" className="min-h-12 rounded-sm bg-[#c8102e] px-5 font-semibold text-white hover:bg-[#a90d27] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c8102e] focus-visible:ring-offset-2">Search</button>
            </div>
          </form>
        )}

        {mobileMenuOpen && (
          <div id="emons-mobile-navigation" className="border-t border-black/5 bg-white px-5 pb-5 pt-3 lg:hidden">
            <div className="flex flex-col">
              {navigationItems.map((item) => (
                <a key={item.label} href={item.href} target={item.external ? "_blank" : undefined} rel={item.external ? "noreferrer" : undefined} className="border-b border-black/5 py-3 text-base font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c8102e]">
                  {item.label}{item.external && <span className="sr-only"> (opens in a new tab)</span>}
                </a>
              ))}
              <a href={freightInquiryHref} className="mt-4 inline-flex min-h-12 items-center justify-center gap-2 rounded-sm bg-[#c8102e] px-5 font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c8102e] focus-visible:ring-offset-2">
                Freight inquiry <ArrowUpRight aria-hidden="true" size={16} />
              </a>
            </div>
          </div>
        )}
      </header>

      <main id="emons-main">
        <section aria-labelledby="emons-hero-title" className="relative isolate min-h-[calc(100svh-76px)] overflow-hidden bg-[#dfded9]">
          <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden bg-[#c8c7c2]">
            <img src={HERO_POSTER} alt="" className="absolute inset-0 h-full w-full object-cover object-center" />
            {videoSrc && (
              <video
                ref={videoRef}
                autoPlay={videoPlaying && motionAllowed}
                playsInline
                muted
                loop
                preload="metadata"
                poster={HERO_POSTER}
                className="absolute inset-0 h-full w-full object-cover"
              >
                <source src={videoSrc} type="video/mp4" />
              </video>
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-black/35 via-black/5 to-black/5" />
          </div>

          <div className="mx-auto flex min-h-[calc(100svh-76px)] max-w-[1600px] flex-col justify-end px-5 pb-6 pt-20 sm:px-8 sm:pb-10 lg:px-12 lg:pb-12">
            <div className="relative max-w-2xl rounded-sm border border-white/70 bg-white/90 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.18)] backdrop-blur-md sm:p-9 lg:p-11">
              {videoSrc && (
                <button
                  type="button"
                  aria-label={videoPlaying ? "Pause background video" : "Play background video"}
                  onClick={() => setVideoPlaying((playing) => !playing && motionAllowed)}
                  className="absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-[#242424] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c8102e]"
                >
                  {videoPlaying ? <Pause aria-hidden="true" size={18} /> : <Play aria-hidden="true" size={18} />}
                </button>
              )}
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#c8102e]">Emons · Transport &amp; logistics since 1928</p>
              <h1 id="emons-hero-title" className="max-w-xl text-3xl font-semibold leading-[1.08] tracking-[-0.035em] sm:text-4xl lg:text-5xl">
                Emons - your forwarding company for transport &amp; logistics
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-[#424242] sm:text-lg sm:leading-8">
                Emons is your forwarding company for transport and logistics — global, connected and efficient. Whether by road, air, sea or rail, we move your freight safely to its destination.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <a href="/en/leistungen" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-sm bg-[#c8102e] px-5 font-semibold text-white hover:bg-[#a90d27] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c8102e] focus-visible:ring-offset-2">
                  Services overview <ArrowUpRight aria-hidden="true" size={16} />
                </a>
                <a href={freightInquiryHref} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-sm border border-[#242424]/25 bg-white/70 px-5 font-semibold text-[#242424] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c8102e] focus-visible:ring-offset-2">
                  For the freight request <ArrowUpRight aria-hidden="true" size={16} />
                </a>
              </div>
            </div>

            <div className="mt-5 rounded-sm bg-white/92 p-2 shadow-lg backdrop-blur-md sm:mt-7 sm:inline-block sm:w-fit sm:p-2">
              <div role="tablist" aria-label="Hero service categories" className="grid grid-cols-2 gap-1 sm:flex sm:flex-wrap">
                {HERO_SLIDES.map((slide, index) => (
                  <button
                    key={slide.id}
                    ref={(node) => { tabRefs.current[index] = node; }}
                    type="button"
                    role="tab"
                    id={`hero-tab-${slide.id}`}
                    aria-selected={activeIndex === index}
                    aria-controls={`hero-panel-${slide.id}`}
                    tabIndex={activeIndex === index ? 0 : -1}
                    onClick={() => selectTab(index)}
                    onKeyDown={onTabKeyDown}
                    className={`min-h-12 rounded-sm px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c8102e] focus-visible:ring-offset-2 motion-reduce:transition-none sm:min-w-32 ${activeIndex === index ? "bg-[#c8102e] text-white" : "text-[#242424] hover:bg-black/5"}`}
                  >
                    {slide.selector}
                  </button>
                ))}
              </div>
              {HERO_SLIDES.map((slide, index) => (
                <div
                  key={slide.id}
                  role="tabpanel"
                  id={`hero-panel-${slide.id}`}
                  aria-labelledby={`hero-tab-${slide.id}`}
                  tabIndex={0}
                  hidden={activeIndex !== index}
                  className="mt-2 rounded-sm px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c8102e]"
                >
                  <h2 className="text-base font-semibold">{slide.heading}</h2>
                  <p className="mt-1 max-w-3xl text-sm leading-6 text-[#424242]">{slide.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default EmonsHeroNavigation;
