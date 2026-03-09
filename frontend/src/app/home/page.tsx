'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import './home.css';

/* ─────────────────────────────────────────────────────────────
   SVG Diamond Logo
───────────────────────────────────────────────────────────── */
function GemLogo() {
    return (
        <svg className="hm-logo-icon" viewBox="0 0 48 48" fill="none">
            <polygon points="24,4 44,18 24,44 4,18" stroke="#B8962E" strokeWidth="1.5" fill="none" />
            <polygon points="24,4 14,18 34,18" fill="rgba(184,150,46,0.15)" stroke="#B8962E" strokeWidth="1" />
            <polygon points="14,18 24,44 4,18" fill="rgba(184,150,46,0.08)" stroke="#B8962E" strokeWidth="1" />
            <polygon points="34,18 24,44 44,18" fill="rgba(184,150,46,0.08)" stroke="#B8962E" strokeWidth="1" />
            <line x1="14" y1="18" x2="34" y2="18" stroke="#B8962E" strokeWidth="1" opacity="0.5" />
        </svg>
    );
}

/* ─────────────────────────────────────────────────────────────
   Image with fallback emoji
───────────────────────────────────────────────────────────── */
function SafeImg({ src, alt, fallback, className, width, height, fill, sizes, style }: {
    src: string; alt: string; fallback: string; className?: string;
    width?: number; height?: number; fill?: boolean; sizes?: string; style?: React.CSSProperties;
}) {
    const [err, setErr] = useState(false);
    if (err) {
        return (
            <div style={{
                width: '100%', height: '100%', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '3rem', background: '#ECEEF2', ...style
            }}>
                {fallback}
            </div>
        );
    }
    if (fill) {
        return <Image src={src} alt={alt} fill sizes={sizes || "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"} className={className} onError={() => setErr(true)} style={{ objectFit: 'cover', ...style }} />;
    }
    return <Image src={src} alt={alt} width={width ?? 800} height={height ?? 500} className={className} onError={() => setErr(true)} style={style} />;
}

/* ─────────────────────────────────────────────────────────────
   Nav data
───────────────────────────────────────────────────────────── */
const NAV_ITEMS = [
    { label: 'About Us', id: 'about', children: ['Our Story', 'Mission & Values', 'Accreditation', 'Global Presence'] },
    { label: 'Services', id: 'services', children: ['Diamond Grading', 'Colored Stone Analysis', 'Jewelry Certification', 'Laser Inscription', 'Appraisals'] },
    { label: 'Education', id: 'education', children: ['Course Catalog', 'Online Programs', 'In-Person Classes', 'Scholarships'] },
    { label: 'Resources', id: 'resources', children: ['Diamond 4Cs', 'Buying Guide', 'Gem Encyclopedia', 'FAQ'] },
    { label: 'News & Events', id: 'news', children: ['Latest News', 'Press Releases', 'Events Calendar'] },
    { label: 'Contact', id: 'contact' },
];

const COURSES = [
    { id: 'GG001', name: 'Graduate Diploma in Gemology', duration: '52 weeks', mode: 'both', start: 'Apr 14, 2026', fee: '₹1,85,000' },
    { id: 'DG010', name: 'Certificate in Diamond Grading', duration: '8 weeks', mode: 'inperson', start: 'May 5, 2026', fee: '₹42,000' },
    { id: 'CS022', name: 'Colored Stones Certificate', duration: '12 weeks', mode: 'online', start: 'Apr 28, 2026', fee: '₹55,000' },
    { id: 'JT031', name: 'Jewelry Design & Appraisal', duration: '16 weeks', mode: 'inperson', start: 'Jun 2, 2026', fee: '₹68,000' },
    { id: 'GL004', name: 'Applied Gemology Online', duration: '24 weeks', mode: 'online', start: 'Apr 7, 2026', fee: '₹72,000' },
];

const NEWS = [
    { id: 1, cat: 'Research', date: 'March 5, 2026', title: 'GemCert Publishes Landmark Study on Lab-Grown Diamond Detection Methods', excerpt: 'Our research team released a peer-reviewed paper on advanced spectroscopic techniques that achieve 99.97% accuracy in natural vs. synthetic diamond differentiation.' },
    { id: 2, cat: 'Awards', date: 'Feb 20, 2026', title: 'New Emerald Sourcing Standards Adopted by 12 International Trade Bodies', excerpt: 'The new framework establishes unified chain-of-custody documentation for Colombian, Zambian, and Brazilian emeralds.' },
    { id: 3, cat: 'Education', date: 'Feb 10, 2026', title: 'GemCert Scholarship Fund Awards 24 Grants to Aspiring Gemologists Worldwide', excerpt: 'Recipients from 14 countries will pursue the Graduate Diploma in Gemology starting April 2026.' },
    { id: 4, cat: 'Industry', date: 'Jan 28, 2026', title: 'Industry Round-Up: Diamond Price Index Shows Stabilisation in Q4 2025', excerpt: 'Certified natural diamonds in the 1.0–1.5ct range held consistent value across major exchanges.' },
    { id: 5, cat: 'Events', date: 'Jan 15, 2026', title: 'Registration Open: International Gemology Symposium — Mumbai, April 2026', excerpt: 'Join leading gemologists, traders, and researchers for three days of talks, workshops, and networking.' },
];

const EVENTS = [
    { day: '14', month: 'APR', title: 'Graduate Diploma Classes Begin', loc: 'Mumbai Campus' },
    { day: '22', month: 'APR', title: 'Colored Stone Grading Workshop', loc: 'Online (Live)' },
    { day: '08', month: 'MAY', title: 'International Gemology Symposium', loc: 'Taj Land\'s End, Mumbai' },
];

/* ─────────────────────────────────────────────────────────────
   Main Component
───────────────────────────────────────────────────────────── */
export default function HomePage() {
    const [openItem, setOpenItem] = useState<string | null>(null);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [formStatus, setFormStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
    const navRef = useRef<HTMLElement>(null);

    /* Close dropdown on outside click */
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (navRef.current && !navRef.current.contains(e.target as Node)) {
                setOpenItem(null);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    /* Scroll reveal */
    useEffect(() => {
        const els = document.querySelectorAll<HTMLElement>('.hm-reveal');
        const io = new IntersectionObserver((entries) =>
            entries.forEach(e => e.isIntersecting && e.target.classList.add('in')),
            { threshold: 0.1 }
        );
        els.forEach(el => io.observe(el));
        return () => io.disconnect();
    }, []);

    function scrollTo(id: string) {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
        setOpenItem(null);
        setMobileOpen(false);
    }

    function toggleItem(id: string) {
        setOpenItem(prev => prev === id ? null : id);
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setFormStatus('sending');
        setTimeout(() => setFormStatus('sent'), 1200);
    }

    function modeClass(mode: string) {
        if (mode === 'online') return 'hm-mode-online';
        if (mode === 'inperson') return 'hm-mode-inperson';
        return 'hm-mode-both';
    }
    function modeLabel(mode: string) {
        if (mode === 'online') return 'Online';
        if (mode === 'inperson') return 'In-Person';
        return 'Hybrid';
    }

    return (
        <div className="hm">

            {/* ── NAVIGATION ──────────────────────────────────────── */}
            <nav className="hm-nav" ref={navRef}>
                {/* Top utility bar */}
                <div className="hm-nav-top">
                    <div className="hm-nav-top-inner">
                        <span>International Gem Institute — Accredited Gemological Laboratory</span>
                        <ul className="hm-nav-top-links">
                            <li><a href="#contact" onClick={e => { e.preventDefault(); scrollTo('contact'); }}>Locate a Lab</a></li>
                            <li><a href="#contact" onClick={e => { e.preventDefault(); scrollTo('contact'); }}>Track Report</a></li>
                            <li><Link href="/login">Staff Portal</Link></li>
                        </ul>
                    </div>
                </div>

                {/* Main bar */}
                <div className="hm-nav-main">
                    <a href="#home" className="hm-logo" onClick={e => { e.preventDefault(); scrollTo('home'); }}>
                        <GemLogo />
                        <div className="hm-logo-text">
                            <span className="hm-logo-name">GemCert Laboratory</span>
                            <span className="hm-logo-sub">Independent Gem Certification</span>
                        </div>
                    </a>

                    <ul className={`hm-nav-links${mobileOpen ? ' hm-open' : ''}`}>
                        <li className="hm-nav-item">
                            <a href="#home" onClick={e => { e.preventDefault(); scrollTo('home'); }}>Home</a>
                        </li>
                        {NAV_ITEMS.map(item => (
                            <li key={item.id} className={`hm-nav-item${openItem === item.id ? ' open' : ''}`}>
                                {item.children ? (
                                    <>
                                        <button onClick={() => toggleItem(item.id)}>
                                            {item.label}
                                            <svg className="hm-nav-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                <polyline points="6 9 12 15 18 9" />
                                            </svg>
                                        </button>
                                        <ul className="hm-dropdown">
                                            {item.children.map(child => (
                                                <li key={child}>
                                                    <a href={`#${item.id}`} onClick={e => { e.preventDefault(); scrollTo(item.id); }}>{child}</a>
                                                </li>
                                            ))}
                                        </ul>
                                    </>
                                ) : (
                                    <a href={`#${item.id}`} onClick={e => { e.preventDefault(); scrollTo(item.id); }}>{item.label}</a>
                                )}
                            </li>
                        ))}
                    </ul>

                    <div className="hm-nav-actions">
                        <a href="#certification" className="hm-btn hm-btn-primary hm-btn-sm"
                            onClick={e => { e.preventDefault(); scrollTo('services'); }}>
                            Verify Report
                        </a>
                        <button
                            className="hm-hamburger"
                            onClick={() => setMobileOpen(o => !o)}
                            aria-label="Toggle menu"
                        >
                            <span /><span /><span />
                        </button>
                    </div>
                </div>
            </nav>

            {/* ── HERO ──────────────────────────────────────────────── */}
            <section id="home" className="hm-hero">
                <div className="hm-hero-bg">
                    <SafeImg src="/images/hero_banner.png" alt="Gemological laboratory" fallback="💎" fill />
                    <div className="hm-hero-overlay" />
                </div>

                <div className="hm-container hm-hero-content">
                    <div className="hm-hero-tag">
                        ✦ &nbsp;Internationally Accredited · Est. 1989
                    </div>
                    <h1 className="hm-h1">
                        The World's Most Trusted<br />Diamond Grading Authority
                    </h1>
                    <p className="hm-hero-sub">
                        Independent, impartial, and internationally accredited certification for
                        diamonds, coloured gemstones, and jewellery. Every stone graded with
                        uncompromising scientific precision.
                    </p>
                    <div className="hm-hero-actions">
                        <a href="#services" className="hm-btn hm-btn-primary"
                            onClick={e => { e.preventDefault(); scrollTo('services'); }}>
                            Explore Services
                        </a>
                        <a href="#education" className="hm-btn hm-btn-outline"
                            onClick={e => { e.preventDefault(); scrollTo('education'); }}>
                            Enrol in a Course
                        </a>
                    </div>

                    <div className="hm-hero-trust">
                        {[
                            { icon: '🏛️', num: '35+ Years', sub: 'of Scientific Excellence' },
                            { icon: '💎', num: '250K+', sub: 'Diamonds Certified' },
                            { icon: '🌐', num: '120+ Countries', sub: 'Recognise Our Reports' },
                            { icon: '🎓', num: '18,000+', sub: 'Graduates Worldwide' },
                        ].map(t => (
                            <div className="hm-trust-item" key={t.sub}>
                                <span className="hm-trust-icon">{t.icon}</span>
                                <div className="hm-trust-label">
                                    <strong>{t.num}</strong>
                                    {t.sub}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── QUICK SERVICES STRIP ─────────────────────────────── */}
            <section className="hm-quick-strip">
                <div className="hm-container">
                    <div className="hm-quick-grid">
                        {[
                            { icon: '📜', title: 'Diamond Reports', desc: 'Full 4Cs grading reports for natural & lab-grown diamonds', id: 'services' },
                            { icon: '💎', title: 'Gemstone Analysis', desc: 'Coloured stone identification, treatment detection & certification', id: 'services' },
                            { icon: '💍', title: 'Jewelry Certification', desc: 'Comprehensive evaluation of mounted stones and jewellery', id: 'services' },
                            { icon: '🎓', title: 'Gemology Courses', desc: 'World-class gemology education online and at our campus', id: 'education' },
                        ].map(q => (
                            <div className="hm-quick-item" key={q.title} onClick={() => scrollTo(q.id)}>
                                <span className="hm-quick-icon">{q.icon}</span>
                                <div className="hm-quick-title">{q.title}</div>
                                <div className="hm-quick-desc">{q.desc}</div>
                                <a className="hm-quick-link" href={`#${q.id}`}
                                    onClick={e => { e.preventDefault(); scrollTo(q.id); }}>
                                    Learn More
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <polyline points="9 18 15 12 9 6" />
                                    </svg>
                                </a>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── ABOUT ──────────────────────────────────────────────── */}
            <section id="about" className="hm-section">
                <div className="hm-container">
                    <div className="hm-about-grid">
                        {/* Image side */}
                        <div className="hm-about-img hm-reveal">
                            <SafeImg src="/images/about_headquarters.png" alt="GemCert Headquarters" fallback="🏛️"
                                width={640} height={480} style={{ width: '100%', height: 'auto' }} />
                            <div className="hm-about-img-caption">
                                GemCert Laboratory headquarters — Mumbai, India · Est. 1989
                            </div>
                        </div>

                        {/* Content side */}
                        <div className="hm-reveal">
                            <span className="hm-eyebrow">About Us</span>
                            <h2 className="hm-h2">Independent Grading. Unimpeachable Authority.</h2>
                            <div className="hm-divider hm-divider-left" />
                            <p className="hm-body" style={{ marginBottom: '1rem' }}>
                                Founded in 1989 by a consortium of master gemologists, GemCert Laboratory
                                was built on a single principle: every diamond deserves an honest, scientifically
                                rigorous analysis free from commercial influence.
                            </p>
                            <p className="hm-body" style={{ marginBottom: '1.5rem' }}>
                                Today we operate three grading facilities across India and maintain affiliations
                                with gemological institutions in 38 countries. Our reports are accepted by
                                exchanges, auction houses, and retailers in over 120 countries.
                            </p>

                            {/* Timeline */}
                            <div className="hm-timeline">
                                {[
                                    { year: '1989', title: 'Founded in Mumbai', desc: 'Established as India\'s first independent gemological testing laboratory.' },
                                    { year: '1997', title: 'International Accreditation', desc: 'Received accreditation from International Gemological Standards Body.' },
                                    { year: '2005', title: 'School of Gemology launched', desc: 'Opened our educational institute; first batch of 120 students enrolled.' },
                                    { year: '2019', title: '30-Year Milestone', desc: '200,000 diamonds certified; labs expanded to Delhi and Surat.' },
                                    { year: '2024', title: 'Lab-Grown Lab', desc: 'Dedicated facility for synthetic and lab-grown diamond differentiation.' },
                                ].map(t => (
                                    <div className="hm-timeline-item" key={t.year}>
                                        <div className="hm-timeline-year">{t.year}</div>
                                        <div className="hm-timeline-content">
                                            <h4>{t.title}</h4>
                                            <p>{t.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="hm-stats-row" style={{ marginTop: '2rem' }}>
                                {[
                                    { num: '3', label: 'Global Labs' },
                                    { num: '38', label: 'Partner Countries' },
                                    { num: '140+', label: 'Gemologists' },
                                ].map(s => (
                                    <div className="hm-stat-box" key={s.label}>
                                        <div className="hm-stat-box-num">{s.num}</div>
                                        <div className="hm-stat-box-label">{s.label}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── SERVICES ───────────────────────────────────────────── */}
            <section id="services" className="hm-section hm-section-alt">
                <div className="hm-container">
                    <div className="hm-section-header hm-reveal">
                        <span className="hm-eyebrow">Services & Certifications</span>
                        <h2 className="hm-h2">Comprehensive Gemological Testing</h2>
                        <div className="hm-divider" />
                        <p className="hm-body" style={{ maxWidth: '56ch', margin: '0 auto' }}>
                            From individual stones to large commercial parcels, our laboratory provides
                            the industry's most trusted suite of gemological testing and certification services.
                        </p>
                    </div>

                    <div className="hm-services-grid">
                        {[
                            {
                                img: '/images/services_diamond_grading.png', emoji: '💎', tag: 'Diamond Grading', title: 'Diamond Grading & Certification',
                                desc: 'Full 4Cs evaluation — Cut, Colour, Clarity, and Carat weight — conducted by GIA-educated gemologists using calibrated spectrometric instruments. Each report includes polish, symmetry, and fluorescence grades.'
                            },
                            {
                                img: '/images/services_gemstones.png', emoji: '🔆', tag: 'Coloured Stones', title: 'Coloured Stone Analysis',
                                desc: 'Species identification, country-of-origin determination, and treatment detection for rubies, sapphires, emeralds, and over 200 gem varieties. Reports include photomicrographs of key inclusions.'
                            },
                            {
                                img: '/images/services_jewelry.png', emoji: '💍', tag: 'Jewellery', title: 'Jewellery Certification',
                                desc: 'Complete appraisal of finished jewellery including mounted stone identification, precious metal hallmarking, and total gem weight estimation. Ideal for insurance, resale, and estate valuation.'
                            },
                            {
                                img: '/images/services_certificate.png', emoji: '📜', tag: 'Identification', title: 'Authenticity & Origin Reports',
                                desc: 'Natural vs. laboratory-grown differentiation using FTIR, UV-Vis, and photoluminescence spectroscopy. Definitive origin determination accepted by leading international exchanges.'
                            },
                            {
                                img: '/images/services_laser.png', emoji: '🔬', tag: 'Specialty', title: 'Laser Inscription Services',
                                desc: 'Precision laser micro-inscription of the GemCert report number on the diamond\'s girdle, providing a permanent link between the stone and its certificate for lifetime traceability.'
                            },
                            {
                                img: '/images/services_gemstones.png', emoji: '🏢', tag: 'Trade Services', title: 'Bulk & Trade Grading',
                                desc: 'High-volume parcel grading for manufacturers, wholesalers, and traders. Dedicated lanes for consignments of 50+ diamonds with competitive rates and rapid 3–5 business day turnaround.'
                            },
                        ].map(svc => (
                            <div className="hm-service-card hm-reveal" key={svc.title}>
                                <div className="hm-service-img">
                                    <SafeImg src={svc.img} alt={svc.title} fallback={svc.emoji} fill />
                                </div>
                                <div className="hm-service-body">
                                    <span className="hm-service-tag">{svc.tag}</span>
                                    <h3 className="hm-h3">{svc.title}</h3>
                                    <p>{svc.desc}</p>
                                    <a className="hm-learn-more" href="#contact"
                                        onClick={e => { e.preventDefault(); scrollTo('contact'); }}>
                                        Enquire Now
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                            <polyline points="9 18 15 12 9 6" />
                                        </svg>
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── EDUCATION ──────────────────────────────────────────── */}
            <section id="education" className="hm-section">
                <div className="hm-container">
                    <div className="hm-section-header hm-reveal">
                        <span className="hm-eyebrow">Education</span>
                        <h2 className="hm-h2">School of Gemology</h2>
                        <div className="hm-divider" />
                        <p className="hm-body" style={{ maxWidth: '58ch', margin: '0 auto' }}>
                            World-class gemology education for aspiring gemologists, jewellery professionals,
                            and gem enthusiasts — available online and at our Mumbai campus.
                        </p>
                    </div>

                    <div className="hm-edu-grid">
                        {/* Course table */}
                        <div className="hm-reveal">
                            <table className="hm-course-table">
                                <thead>
                                    <tr>
                                        <th>Course ID</th>
                                        <th>Programme</th>
                                        <th>Duration</th>
                                        <th>Mode</th>
                                        <th>Start Date</th>
                                        <th>Fee (INR)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {COURSES.map(c => (
                                        <tr key={c.id}>
                                            <td><span className="hm-course-id">{c.id}</span></td>
                                            <td><span className="hm-course-name">{c.name}</span></td>
                                            <td>{c.duration}</td>
                                            <td><span className={`hm-course-mode ${modeClass(c.mode)}`}>{modeLabel(c.mode)}</span></td>
                                            <td>{c.start}</td>
                                            <td>{c.fee}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div style={{ marginTop: '1.5rem' }}>
                                <a href="#contact" className="hm-btn hm-btn-navy hm-btn-sm"
                                    onClick={e => { e.preventDefault(); scrollTo('contact'); }}>
                                    Request Prospectus
                                </a>
                            </div>
                        </div>

                        {/* Info cards */}
                        <div className="hm-edu-info hm-reveal">
                            {[
                                { icon: '🎓', img: '/images/education_diploma.png', title: 'Graduate Diploma in Gemology', desc: 'Our flagship 52-week programme covers diamonds, coloured stones, pearls, gem identification, and laboratory techniques. Internationally recognised qualification.', link: 'Learn about the GDG →' },
                                { icon: '💻', img: '/images/education_online.png', title: 'Online Programmes', desc: 'Study at your own pace with live virtual labs, expert instructor access, and interactive learning modules. Flexible schedules for working professionals.', link: 'View online courses →' },
                                { icon: '🏆', img: '/images/education_classroom.png', title: 'Merit Scholarships', desc: 'GemCert awards 24 annual scholarships for the Graduate Diploma. Applications open January each year. Merit-based and need-based options available.', link: 'Apply for scholarship →' },
                            ].map(c => (
                                <div className="hm-edu-card" key={c.title}>
                                    <div className="hm-edu-card-img">
                                        <SafeImg src={c.img} alt={c.title} fallback={c.icon} fill />
                                    </div>
                                    <div style={{ padding: '1.25rem 1.5rem 1.5rem' }}>
                                        <div className="hm-edu-card-icon" style={{ padding: 0 }}>{c.icon}</div>
                                        <h3 className="hm-h3">{c.title}</h3>
                                        <p>{c.desc}</p>
                                        <a className="hm-learn-more" href="#contact"
                                            onClick={e => { e.preventDefault(); scrollTo('contact'); }}>
                                            {c.link}
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── RESOURCES ──────────────────────────────────────────── */}
            <section id="resources" className="hm-section hm-section-alt">
                <div className="hm-container">
                    <div className="hm-section-header hm-reveal">
                        <span className="hm-eyebrow">Consumer Education</span>
                        <h2 className="hm-h2">Understanding Your Diamond</h2>
                        <div className="hm-divider" />
                        <p className="hm-body" style={{ maxWidth: '56ch', margin: '0 auto' }}>
                            Informed buyers make confident decisions. Explore our guides to understand
                            the factors that define a diamond's quality and value.
                        </p>
                    </div>

                    {/* 4Cs */}
                    <div className="hm-4cs-grid">
                        {[
                            { img: '/images/resources_4cs_cut.png', emoji: '✂️', label: 'The First C', title: 'Cut', desc: 'Cut grades the precision of a diamond\'s facets — Excellent to Poor — determining how brilliantly it interacts with light. The most impactful of the four Cs on a stone\'s visual beauty.' },
                            { img: '/images/resources_4cs_color.png', emoji: '🎨', label: 'The Second C', title: 'Colour', desc: 'Graded D (colourless) to Z (light yellow/brown). Colourless diamonds allow the most light to pass through, creating greater brilliance. GemCert grades each stone in controlled, neutral-light conditions.' },
                            { img: '/images/resources_4cs_clarity.png', emoji: '🔍', label: 'The Third C', title: 'Clarity', desc: 'Evaluates internal inclusions and external blemishes under 10× magnification. Rated FL (Flawless) to I3 (Included). GemCert clarity grades are set by committee review.' },
                            { img: '/images/resources_4cs_carat.png', emoji: '⚖️', label: 'The Fourth C', title: 'Carat', desc: 'The precise metric weight of the diamond. 1 carat = 200 milligrams. GemCert measures to the nearest 0.01 carat on calibrated electronic scales certified to national standards.' },
                        ].map(c => (
                            <div className="hm-c-card hm-reveal" key={c.title}>
                                <div className="hm-c-card-img">
                                    <SafeImg src={c.img} alt={c.title} fallback={c.emoji} fill />
                                </div>
                                <div className="hm-c-card-body">
                                    <div className="hm-c-label">{c.label}</div>
                                    <div className="hm-c-title">{c.title}</div>
                                    <p className="hm-c-desc">{c.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Buying guides */}
                    <div className="hm-guides-row hm-reveal">
                        {[
                            { img: '/images/resources_buying_guide.png', emoji: '🛒', title: 'How to Buy a Diamond', desc: 'From setting a budget to decoding a grading report — a practical guide to purchasing a diamond with confidence. Covers solitaires, engagement rings, and investment stones.' },
                            { img: '/images/services_gemstones.png', emoji: '📖', title: 'Gem Encyclopedia', desc: 'A comprehensive A–Z reference covering over 200 gem varieties. Includes optical properties, hardness, treatments, and country of origin for each species.' },
                        ].map(g => (
                            <div className="hm-guide-card" key={g.title}>
                                <div className="hm-guide-img">
                                    <SafeImg src={g.img} alt={g.title} fallback={g.emoji} fill />
                                </div>
                                <div className="hm-guide-body">
                                    <h4>{g.title}</h4>
                                    <p>{g.desc}</p>
                                    <a className="hm-learn-more" href="#" onClick={e => e.preventDefault()}>
                                        Read Guide →
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── NEWS & EVENTS ─────────────────────────────────────── */}
            <section id="news" className="hm-section">
                <div className="hm-container">
                    <div className="hm-section-header hm-reveal">
                        <span className="hm-eyebrow">News & Events</span>
                        <h2 className="hm-h2">Latest from GemCert</h2>
                        <div className="hm-divider" />
                    </div>

                    <div className="hm-news-grid hm-reveal">
                        {/* Featured */}
                        <div className="hm-news-featured">
                            <div className="hm-news-featured-img">
                                <SafeImg src="/images/news_research.png" alt="Research" fallback="🔬" fill />
                            </div>
                            <div className="hm-news-featured-body">
                                <div className="hm-news-meta">
                                    <span className="hm-news-category">{NEWS[0].cat}</span>
                                    <span className="hm-news-date">{NEWS[0].date}</span>
                                </div>
                                <h3 className="hm-h3">{NEWS[0].title}</h3>
                                <p>{NEWS[0].excerpt}</p>
                                <a className="hm-learn-more" href="#" onClick={e => e.preventDefault()}>
                                    Read Full Article →
                                </a>
                            </div>
                        </div>

                        {/* Side list */}
                        <div className="hm-news-list">
                            {NEWS.slice(1).map(n => (
                                <div className="hm-news-item" key={n.id}>
                                    <div className="hm-news-meta">
                                        <span className="hm-news-category">{n.cat}</span>
                                        <span className="hm-news-date">{n.date}</span>
                                    </div>
                                    <h4>{n.title}</h4>
                                    <p>{n.excerpt}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Events */}
                    <div className="hm-events-strip hm-reveal" style={{ marginTop: '2.5rem' }}>
                        <div style={{ flexShrink: 0 }}>
                            <span className="hm-eyebrow" style={{ color: 'rgba(255,255,255,0.5)' }}>Upcoming Events</span>
                            <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.25rem', color: '#fff', marginTop: 4 }}>Don't miss these</h3>
                        </div>
                        {EVENTS.map(ev => (
                            <div className="hm-event-item" key={ev.title}>
                                <div className="hm-event-date">
                                    <div className="hm-event-day">{ev.day}</div>
                                    <div className="hm-event-month">{ev.month}</div>
                                </div>
                                <div className="hm-event-info">
                                    <h4>{ev.title}</h4>
                                    <p>📍 {ev.loc}</p>
                                </div>
                            </div>
                        ))}
                        <a href="#contact" className="hm-btn hm-btn-primary hm-btn-sm"
                            onClick={e => { e.preventDefault(); scrollTo('contact'); }}>
                            Register
                        </a>
                    </div>
                </div>
            </section>

            {/* ── CONTACT ────────────────────────────────────────────── */}
            <section id="contact" className="hm-section hm-section-alt">
                <div className="hm-container">
                    <div className="hm-section-header hm-reveal">
                        <span className="hm-eyebrow">Contact</span>
                        <h2 className="hm-h2">Get in Touch</h2>
                        <div className="hm-divider" />
                        <p className="hm-body" style={{ maxWidth: '52ch', margin: '0 auto' }}>
                            Whether you're an individual client, a jewellery retailer, or a diamond trader,
                            our team is ready to assist with any enquiry.
                        </p>
                    </div>

                    <div className="hm-contact-grid">
                        <div className="hm-contact-cards hm-reveal">
                            {[
                                { icon: '📞', title: 'Phone', body: <><a href="tel:+918001234567">+91 800 123 4567</a><br /><span>Mon–Sat 9 AM–6 PM IST</span></> },
                                { icon: '✉️', title: 'Email', body: <><a href="mailto:info@gemcertlab.org">info@gemcertlab.org</a><br /><a href="mailto:reports@gemcertlab.org">reports@gemcertlab.org</a></> },
                                { icon: '📍', title: 'Address', body: <><span>Gem Tower, 4th Floor, Diamond District</span><br /><span>Mumbai, Maharashtra 400001, India</span></> },
                                { icon: '🕐', title: 'Hours', body: <><span>Mon–Fri: 9:00 AM – 6:00 PM</span><br /><span>Saturday: 10:00 AM – 3:00 PM</span></> },
                            ].map(c => (
                                <div className="hm-contact-card" key={c.title}>
                                    <div className="hm-contact-icon">{c.icon}</div>
                                    <div className="hm-contact-detail">
                                        <h4>{c.title}</h4>
                                        <p>{c.body}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="hm-form hm-reveal">
                            <h3 className="hm-h3">Send an Enquiry</h3>
                            {formStatus === 'sent' ? (
                                <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
                                    <h4 className="hm-h3" style={{ marginBottom: '0.5rem' }}>Enquiry Received</h4>
                                    <p className="hm-body" style={{ marginBottom: '1.5rem' }}>
                                        Thank you for contacting GemCert Laboratory. We will respond within one business day.
                                    </p>
                                    <button className="hm-btn hm-btn-navy hm-btn-sm" onClick={() => setFormStatus('idle')}>
                                        Send Another
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit}>
                                    <div className="hm-form-row">
                                        <div className="hm-field">
                                            <label htmlFor="hm-fname">First Name</label>
                                            <input id="hm-fname" type="text" placeholder="John" required />
                                        </div>
                                        <div className="hm-field">
                                            <label htmlFor="hm-lname">Last Name</label>
                                            <input id="hm-lname" type="text" placeholder="Doe" required />
                                        </div>
                                    </div>
                                    <div className="hm-field">
                                        <label htmlFor="hm-email">Email</label>
                                        <input id="hm-email" type="email" placeholder="john.doe@example.com" required />
                                    </div>
                                    <div className="hm-field">
                                        <label htmlFor="hm-org">Organisation (optional)</label>
                                        <input id="hm-org" type="text" placeholder="Your company or firm" />
                                    </div>
                                    <div className="hm-field">
                                        <label htmlFor="hm-service">Service / Enquiry Type</label>
                                        <select id="hm-service" required defaultValue="">
                                            <option value="" disabled>Select…</option>
                                            <option>Diamond Grading Report</option>
                                            <option>Coloured Stone Analysis</option>
                                            <option>Jewellery Certification</option>
                                            <option>Laser Inscription</option>
                                            <option>Bulk / Trade Grading</option>
                                            <option>Education Enquiry</option>
                                            <option>Certificate Verification</option>
                                            <option>General Enquiry</option>
                                        </select>
                                    </div>
                                    <div className="hm-field">
                                        <label htmlFor="hm-message">Message</label>
                                        <textarea id="hm-message" placeholder="Please describe your requirements…" required />
                                    </div>
                                    <button type="submit" className="hm-btn hm-btn-navy" style={{ width: '100%', justifyContent: 'center' }}
                                        disabled={formStatus === 'sending'}>
                                        {formStatus === 'sending' ? 'Sending…' : 'Submit Enquiry'}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── FOOTER ─────────────────────────────────────────────── */}
            <footer className="hm-footer">
                <div className="hm-footer-top">
                    <div className="hm-container">
                        <div className="hm-footer-grid">
                            {/* Brand */}
                            <div className="hm-footer-brand">
                                <a href="#home" className="hm-logo" onClick={e => { e.preventDefault(); scrollTo('home'); }}>
                                    <GemLogo />
                                    <div className="hm-logo-text">
                                        <span className="hm-logo-name">GemCert Laboratory</span>
                                        <span className="hm-logo-sub">Independent Gem Certification</span>
                                    </div>
                                </a>
                                <p>
                                    Internationally accredited diamond grading and gemological testing since 1989.
                                    Trusted by jewellers, traders, and collectors in over 120 countries.
                                </p>
                                <div className="hm-footer-accred">
                                    <span className="hm-accred-badge">IGS Accredited</span>
                                    <span className="hm-accred-badge">ISO 17025</span>
                                    <span className="hm-accred-badge">BJA Member</span>
                                </div>
                            </div>

                            {/* Services */}
                            <div className="hm-footer-col">
                                <h4>Services</h4>
                                <ul>
                                    {['Diamond Grading', 'Coloured Stone Analysis', 'Jewellery Certification', 'Laser Inscription', 'Bulk Grading', 'Appraisals'].map(s => (
                                        <li key={s}><a href="#services" onClick={e => { e.preventDefault(); scrollTo('services'); }}>{s}</a></li>
                                    ))}
                                </ul>
                            </div>

                            {/* Education */}
                            <div className="hm-footer-col">
                                <h4>Education</h4>
                                <ul>
                                    {['Graduate Diploma', 'Diamond Grading Cert', 'Coloured Stones Cert', 'Online Programmes', 'Scholarships', 'Course Schedule'].map(s => (
                                        <li key={s}><a href="#education" onClick={e => { e.preventDefault(); scrollTo('education'); }}>{s}</a></li>
                                    ))}
                                </ul>
                            </div>

                            {/* Portal */}
                            <div className="hm-footer-col">
                                <h4>Portal & Info</h4>
                                <ul>
                                    <li><a href="#about" onClick={e => { e.preventDefault(); scrollTo('about'); }}>About GemCert</a></li>
                                    <li><a href="#news" onClick={e => { e.preventDefault(); scrollTo('news'); }}>News & Events</a></li>
                                    <li><a href="#resources" onClick={e => { e.preventDefault(); scrollTo('resources'); }}>Consumer Guides</a></li>
                                    <li><a href="#contact" onClick={e => { e.preventDefault(); scrollTo('contact'); }}>Verify Certificate</a></li>
                                    <li><a href="#contact" onClick={e => { e.preventDefault(); scrollTo('contact'); }}>Locate a Lab</a></li>
                                </ul>
                                {/* Staff Login Link */}
                                <Link href="/login" className="hm-footer-staff-link" style={{ marginTop: '1rem', display: 'inline-flex' }}>
                                    🔐 Staff Login
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="hm-container">
                    <div className="hm-footer-bottom">
                        <p className="hm-footer-copy">
                            © {new Date().getFullYear()} GemCert Laboratory Pvt. Ltd. All rights reserved. &nbsp;·&nbsp; CIN: U74999MH1989PTC000000
                        </p>
                        <ul className="hm-footer-legal">
                            <li><a href="#">Privacy Policy</a></li>
                            <li><a href="#">Terms of Use</a></li>
                            <li><a href="#">Cookie Notice</a></li>
                            <li><a href="#">Code of Conduct</a></li>
                        </ul>
                    </div>
                </div>
            </footer>
        </div>
    );
}
