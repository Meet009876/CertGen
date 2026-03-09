'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import './landing.css';

/* ─────────────────────────────────────────
   Diamond SVG Logo Mark
───────────────────────────────────────── */
function DiamondLogo() {
    return (
        <svg
            className="lp-logo-gem"
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <polygon points="24,4 44,18 24,44 4,18" fill="none" stroke="#C9A84C" strokeWidth="1.5" />
            <polygon points="24,4 14,18 34,18" fill="rgba(201,168,76,0.12)" stroke="#C9A84C" strokeWidth="1" />
            <polygon points="14,18 24,44 4,18" fill="rgba(201,168,76,0.07)" stroke="#C9A84C" strokeWidth="1" />
            <polygon points="34,18 24,44 44,18" fill="rgba(201,168,76,0.07)" stroke="#C9A84C" strokeWidth="1" />
            <line x1="14" y1="18" x2="34" y2="18" stroke="#C9A84C" strokeWidth="1" opacity="0.5" />
            <line x1="24" y1="4" x2="24" y2="18" stroke="#C9A84C" strokeWidth="0.75" opacity="0.4" />
        </svg>
    );
}

/* ─────────────────────────────────────────
   Sparkle particle data
───────────────────────────────────────── */
const SPARKLES = Array.from({ length: 28 }, (_, i) => ({
    id: i,
    left: `${5 + Math.abs(Math.sin(i * 37.1) * 90)}%`,
    top: `${5 + Math.abs(Math.cos(i * 23.7) * 90)}%`,
    size: 1 + (i % 3),
    dur: `${2.5 + (i % 4) * 0.8}s`,
    delay: `${(i % 7) * 0.4}s`,
}));

/* ─────────────────────────────────────────
   Main Component
───────────────────────────────────────── */
export default function LandingPage() {
    const [scrolled, setScrolled] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [formStatus, setFormStatus] = useState<'idle' | 'sending' | 'sent'>('idle');

    /* Sticky nav */
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 60);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    /* Scroll-reveal */
    useEffect(() => {
        const els = document.querySelectorAll<HTMLElement>('.lp-reveal');
        const io = new IntersectionObserver(
            (entries) =>
                entries.forEach((e) => {
                    if (e.isIntersecting) {
                        (e.target as HTMLElement).classList.add('visible');
                    }
                }),
            { threshold: 0.12 }
        );
        els.forEach((el) => io.observe(el));
        return () => io.disconnect();
    }, []);

    function scrollTo(id: string) {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
        setMenuOpen(false);
    }

    function handleFormSubmit(e: React.FormEvent) {
        e.preventDefault();
        setFormStatus('sending');
        setTimeout(() => setFormStatus('sent'), 1400);
    }

    return (
        <div className="lp-root">
            {/* ── NAVIGATION ───────────────────────────────────────── */}
            <nav className={`lp-nav${scrolled ? ' scrolled' : ''}`}>
                <div className="lp-nav-inner">
                    <a href="#home" className="lp-logo" onClick={(e) => { e.preventDefault(); scrollTo('home'); }}>
                        <DiamondLogo />
                        <div className="lp-logo-text">
                            <span className="lp-logo-name">GemCert Lab</span>
                            <span className="lp-logo-tagline">Diamond Certification Authority</span>
                        </div>
                    </a>

                    <ul className={`lp-nav-links${menuOpen ? ' open' : ''}`}>
                        {[
                            ['home', 'Home'],
                            ['about', 'About Us'],
                            ['services', 'Services'],
                            ['certification', 'Certification'],
                            ['contact', 'Contact'],
                        ].map(([id, label]) => (
                            <li key={id}>
                                <a
                                    href={`#${id}`}
                                    onClick={(e) => { e.preventDefault(); scrollTo(id); }}
                                    className={id === 'contact' ? '' : ''}
                                >
                                    {label}
                                </a>
                            </li>
                        ))}
                    </ul>

                    <button
                        className="lp-hamburger"
                        onClick={() => setMenuOpen((o) => !o)}
                        aria-label="Toggle menu"
                    >
                        <span />
                        <span />
                        <span />
                    </button>
                </div>
            </nav>

            {/* ── HERO ─────────────────────────────────────────────── */}
            <section id="home" className="lp-hero">
                <div className="lp-hero-bg">
                    <Image
                        src="/diamond_hero.png"
                        alt="Diamond brilliance"
                        fill
                        priority
                        className="lp-hero-img"
                        sizes="100vw"
                    />
                    <div className="lp-hero-overlay" />
                </div>

                {/* Sparkle particles */}
                <div className="lp-sparkles" aria-hidden="true">
                    {SPARKLES.map((s) => (
                        <span
                            key={s.id}
                            className="lp-sparkle"
                            style={{
                                left: s.left,
                                top: s.top,
                                width: `${s.size}px`,
                                height: `${s.size}px`,
                                '--dur': s.dur,
                                '--delay': s.delay,
                            } as React.CSSProperties}
                        />
                    ))}
                </div>

                <div className="lp-hero-content">
                    <div className="lp-hero-badge">
                        <span className="lp-hero-badge-dot" />
                        Internationally Accredited Gemological Laboratory
                    </div>

                    <h1 className="lp-hero-h1">
                        Precision Testing.<br />
                        <em>Certified Brilliance.</em>
                    </h1>

                    <p className="lp-hero-sub">
                        Trusted diamond grading and certification by the world's most meticulous
                        gemologists. Every facet analysed. Every report guaranteed.
                    </p>

                    <div className="lp-hero-actions">
                        <a
                            href="#services"
                            className="lp-btn-primary"
                            onClick={(e) => { e.preventDefault(); scrollTo('services'); }}
                        >
                            Explore Services
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polyline points="9 18 15 12 9 6" />
                            </svg>
                        </a>
                        <a
                            href="#certification"
                            className="lp-btn-ghost"
                            onClick={(e) => { e.preventDefault(); scrollTo('certification'); }}
                        >
                            Verify Certificate
                        </a>
                    </div>
                </div>

                <div className="lp-hero-scroll" onClick={() => scrollTo('stats')}>
                    <span>Scroll</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="6 9 12 15 18 9" />
                    </svg>
                </div>
            </section>

            {/* ── STATS STRIP ──────────────────────────────────────── */}
            <section id="stats" className="lp-stats">
                <div className="lp-stats-inner">
                    {[
                        { num: '250K+', label: 'Diamonds Certified' },
                        { num: '35+', label: 'Years of Excellence' },
                        { num: '99.8%', label: 'Accuracy Rate' },
                        { num: '120+', label: 'Countries Served' },
                    ].map((s) => (
                        <div className="lp-stat lp-reveal" key={s.label}>
                            <div className="lp-stat-num lp-serif">{s.num}</div>
                            <div className="lp-stat-label">{s.label}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── ABOUT ────────────────────────────────────────────── */}
            <section id="about" className="lp-section lp-section-dark">
                <div className="lp-container">
                    <div className="lp-about-grid">
                        <div className="lp-about-img-wrap lp-reveal">
                            <Image
                                src="/diamonds_lab.png"
                                alt="Gemological laboratory"
                                width={600}
                                height={450}
                                className="lp-about-img"
                            />
                        </div>

                        <div className="lp-about-content lp-reveal">
                            <span className="lp-eyebrow">About Us</span>
                            <h2 className="lp-section-title">
                                A Legacy of Gemological Excellence
                            </h2>
                            <p className="lp-section-subtitle" style={{ marginBottom: '1.25rem' }}>
                                Founded by master gemologists, GemCert Laboratory has spent over three
                                decades setting the benchmark for diamond analysis. Our state-of-the-art
                                facility combines advanced spectrometric technology with the trained eye
                                of certified experts.
                            </p>
                            <p className="lp-section-subtitle">
                                Every stone that passes through our laboratory receives rigorous, impartial
                                evaluation — producing reports that jewellers, traders, and consumers around
                                the world rely on with total confidence.
                            </p>

                            <div className="lp-values-grid">
                                {[
                                    { icon: '🔬', title: 'Scientific Rigour', desc: 'Spectrometry, fluorescence testing and microscopic analysis on every stone.' },
                                    { icon: '⚖️', title: 'Absolute Impartiality', desc: 'Independent evaluations, free from commercial conflicts of interest.' },
                                    { icon: '🏛️', title: 'Institutional Trust', desc: 'Accredited by international gemological bodies and trade standards.' },
                                    { icon: '🌐', title: 'Global Recognition', desc: 'Certificates accepted by jewellers and exchanges in over 120 countries.' },
                                ].map((v) => (
                                    <div className="lp-value-card" key={v.title}>
                                        <div className="lp-value-icon">{v.icon}</div>
                                        <div className="lp-value-title">{v.title}</div>
                                        <div className="lp-value-desc">{v.desc}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── SERVICES ─────────────────────────────────────────── */}
            <section id="services" className="lp-section lp-section-mid">
                <div className="lp-container">
                    <div className="lp-section-header lp-reveal">
                        <span className="lp-eyebrow">Services</span>
                        <h2 className="lp-section-title">Comprehensive Diamond Testing</h2>
                        <div className="lp-divider" />
                        <p className="lp-section-subtitle">
                            From single precious stones to large commercial parcels, our laboratory
                            provides the industry's most comprehensive suite of gemological services.
                        </p>
                    </div>

                    <div className="lp-services-grid">
                        {[
                            {
                                icon: '💎',
                                title: 'Diamond Grading',
                                desc: 'Full four-factor evaluation — Cut, Colour, Clarity and Carat weight — conducted by GIA-trained gemologists using calibrated instruments.',
                            },
                            {
                                icon: '🧪',
                                title: 'Authenticity Testing',
                                desc: 'Natural vs. synthetic detection using spectroscopic analysis, UV fluorescence and thermal conductivity, delivering definitive origin confirmation.',
                            },
                            {
                                icon: '📜',
                                title: 'Certification Reports',
                                desc: 'Tamper-evident, serialised grading reports with QR verification, accepted at leading exchanges and auction houses worldwide.',
                            },
                            {
                                icon: '💍',
                                title: 'Jewellery Testing',
                                desc: 'Appraisal and quality analysis for mounted diamonds and finished jewellery pieces, including metal hallmarking and stone identification.',
                            },
                            {
                                icon: '🏢',
                                title: 'Trade & Bulk Services',
                                desc: 'High-volume parcel grading services for traders, manufacturers and wholesalers, with rapid turnaround and competitive rates.',
                            },
                            {
                                icon: '⚡',
                                title: 'Express Certification',
                                desc: 'Priority lane processing for urgent requirements, delivering full grading reports within 24–48 hours without compromise on accuracy.',
                            },
                        ].map((svc) => (
                            <div className="lp-service-card lp-reveal" key={svc.title}>
                                <div className="lp-service-icon">{svc.icon}</div>
                                <h3 className="lp-service-title">{svc.title}</h3>
                                <p className="lp-service-desc">{svc.desc}</p>
                                <a
                                    href="#contact"
                                    className="lp-service-link"
                                    onClick={(e) => { e.preventDefault(); scrollTo('contact'); }}
                                >
                                    Enquire
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <polyline points="9 18 15 12 9 6" />
                                    </svg>
                                </a>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CERTIFICATION ────────────────────────────────────── */}
            <section id="certification" className="lp-section lp-section-dark">
                <div className="lp-container">
                    <div className="lp-section-header lp-reveal">
                        <span className="lp-eyebrow">Certification</span>
                        <h2 className="lp-section-title">How We Grade Every Diamond</h2>
                        <div className="lp-divider" />
                        <p className="lp-section-subtitle">
                            Our grading process follows internationally recognised protocols,
                            ensuring every certificate reflects the true measured quality of the stone.
                        </p>
                    </div>

                    {/* Grading Process */}
                    <div className="lp-cert-process">
                        {[
                            { num: '01', title: 'Submission', desc: 'Submit your stone or parcel securely at our facility or via our authorised logistics partners.' },
                            { num: '02', title: 'Analysis', desc: 'Expert gemologists and precision instruments examine every aspect of the diamond under controlled conditions.' },
                            { num: '03', title: 'Verification', desc: 'A second senior gemologist independently reviews all measurements and grades for absolute accuracy.' },
                            { num: '04', title: 'Certification', desc: 'A serialised, tamper-evident report is issued and registered in our secure online verification database.' },
                        ].map((step) => (
                            <div className="lp-process-step lp-reveal" key={step.num}>
                                <div className="lp-process-num">{step.num}</div>
                                <h4 className="lp-process-title">{step.title}</h4>
                                <p className="lp-process-desc">{step.desc}</p>
                            </div>
                        ))}
                    </div>

                    {/* 4Cs */}
                    <h3 className="lp-4cs-title lp-reveal">The Four Pillars of Diamond Quality</h3>
                    <div className="lp-4cs-grid">
                        {[
                            {
                                letter: 'C', icon: '✂️', name: 'Cut',
                                desc: 'The most complex of the four Cs, cut grades the precision of a diamond\'s facets — determining how brilliantly it interacts with light.',
                            },
                            {
                                letter: 'C', icon: '🎨', name: 'Colour',
                                desc: 'Graded on a D-to-Z scale, colour measures the absence of yellow or brown tints, with colourless stones commanding the highest value.',
                            },
                            {
                                letter: 'C', icon: '🔍', name: 'Clarity',
                                desc: 'Evaluates internal inclusions and external blemishes under 10× magnification, rated from Flawless to Included on a standardised scale.',
                            },
                            {
                                letter: 'C', icon: '⚖️', name: 'Carat',
                                desc: 'The precise metric weight of the diamond. One carat equals 200 milligrams, measured to the fifth decimal place for certification.',
                            },
                        ].map((c, i) => (
                            <div className="lp-c-card lp-reveal" key={`${c.name}-${i}`}>
                                <span className="lp-c-letter">{c.letter}</span>
                                <span className="lp-c-icon">{c.icon}</span>
                                <div className="lp-c-name">{c.name}</div>
                                <p className="lp-c-desc">{c.desc}</p>
                            </div>
                        ))}
                    </div>

                    {/* Verify banner */}
                    <div className="lp-verify-banner lp-reveal">
                        <div className="lp-verify-badge">🛡️</div>
                        <div className="lp-verify-text">
                            <h3>Verify a GemCert Certificate</h3>
                            <p>
                                Every certificate we issue is registered in our tamper-proof digital registry.
                                Enter the unique serial number printed on your report to instantly confirm its
                                authenticity and view the full grading record.
                            </p>
                        </div>
                        <a
                            href="#contact"
                            className="lp-btn-primary"
                            style={{ flexShrink: 0 }}
                            onClick={(e) => { e.preventDefault(); scrollTo('contact'); }}
                        >
                            Verify Now
                        </a>
                    </div>
                </div>
            </section>

            {/* ── CONTACT ──────────────────────────────────────────── */}
            <section id="contact" className="lp-section lp-section-mid">
                <div className="lp-container">
                    <div className="lp-section-header lp-reveal">
                        <span className="lp-eyebrow">Contact</span>
                        <h2 className="lp-section-title">Get in Touch</h2>
                        <div className="lp-divider" />
                        <p className="lp-section-subtitle">
                            Whether you're a private client, jewellery retailer, or diamond trader,
                            our team is ready to assist with your certification requirements.
                        </p>
                    </div>

                    <div className="lp-contact-grid">
                        {/* Contact cards */}
                        <div className="lp-contact-info lp-reveal">
                            <h3 className="lp-form-title" style={{ marginBottom: '1.5rem' }}>Contact Information</h3>
                            {[
                                {
                                    icon: '📞',
                                    title: 'Phone',
                                    content: <><a href="tel:+918001234567">+91 800 123 4567</a><br /><span>Mon – Sat, 9 AM – 6 PM IST</span></>,
                                },
                                {
                                    icon: '✉️',
                                    title: 'Email',
                                    content: <><a href="mailto:info@gemcertlab.com">info@gemcertlab.com</a><br /><a href="mailto:certification@gemcertlab.com">certification@gemcertlab.com</a></>,
                                },
                                {
                                    icon: '📍',
                                    title: 'Laboratory Address',
                                    content: <><span>Gem Tower, 4th Floor, Diamond District</span><br /><span>Mumbai, Maharashtra 400001, India</span></>,
                                },
                                {
                                    icon: '🕐',
                                    title: 'Working Hours',
                                    content: <><span>Monday – Friday: 9:00 AM – 6:00 PM</span><br /><span>Saturday: 10:00 AM – 3:00 PM</span></>,
                                },
                            ].map((card) => (
                                <div className="lp-contact-card" key={card.title}>
                                    <div className="lp-contact-ico">{card.icon}</div>
                                    <div className="lp-contact-detail">
                                        <h4>{card.title}</h4>
                                        <p>{card.content}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Contact form */}
                        <div className="lp-contact-form lp-reveal">
                            <h3 className="lp-form-title">Send an Enquiry</h3>

                            {formStatus === 'sent' ? (
                                <div style={{
                                    textAlign: 'center',
                                    padding: '3rem 1rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '1rem',
                                }}>
                                    <span style={{ fontSize: '3.5rem' }}>✅</span>
                                    <h4 className="lp-form-title" style={{ marginBottom: 0 }}>Message Received</h4>
                                    <p style={{ color: 'var(--silver)', fontSize: '0.9375rem' }}>
                                        Thank you for reaching out. One of our team members will contact you
                                        within one business day.
                                    </p>
                                    <button
                                        className="lp-btn-ghost"
                                        style={{ marginTop: '0.5rem' }}
                                        onClick={() => setFormStatus('idle')}
                                    >
                                        Send Another
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleFormSubmit}>
                                    <div className="lp-form-row">
                                        <div className="lp-field">
                                            <label htmlFor="lp-first-name">First Name</label>
                                            <input id="lp-first-name" type="text" placeholder="John" required />
                                        </div>
                                        <div className="lp-field">
                                            <label htmlFor="lp-last-name">Last Name</label>
                                            <input id="lp-last-name" type="text" placeholder="Doe" required />
                                        </div>
                                    </div>

                                    <div className="lp-field">
                                        <label htmlFor="lp-email">Email Address</label>
                                        <input id="lp-email" type="email" placeholder="john.doe@example.com" required />
                                    </div>

                                    <div className="lp-field">
                                        <label htmlFor="lp-phone">Phone Number</label>
                                        <input id="lp-phone" type="tel" placeholder="+91 98765 43210" />
                                    </div>

                                    <div className="lp-field">
                                        <label htmlFor="lp-service">Service Required</label>
                                        <select id="lp-service" required defaultValue="">
                                            <option value="" disabled>Select a service…</option>
                                            <option>Diamond Grading</option>
                                            <option>Authenticity Testing</option>
                                            <option>Certification Report</option>
                                            <option>Jewellery Testing</option>
                                            <option>Bulk / Trade Services</option>
                                            <option>Express Certification</option>
                                            <option>Certificate Verification</option>
                                            <option>General Enquiry</option>
                                        </select>
                                    </div>

                                    <div className="lp-field">
                                        <label htmlFor="lp-message">Message</label>
                                        <textarea
                                            id="lp-message"
                                            placeholder="Please describe your requirements…"
                                            required
                                        />
                                    </div>

                                    <div className="lp-form-submit">
                                        <button
                                            type="submit"
                                            className="lp-btn-primary"
                                            style={{ width: '100%', justifyContent: 'center' }}
                                            disabled={formStatus === 'sending'}
                                        >
                                            {formStatus === 'sending' ? (
                                                <>Sending…</>
                                            ) : (
                                                <>
                                                    Send Enquiry
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                        <line x1="22" y1="2" x2="11" y2="13" />
                                                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                                                    </svg>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── FOOTER ───────────────────────────────────────────── */}
            <footer className="lp-footer">
                <div className="lp-footer-inner">
                    <div className="lp-footer-top">
                        <div className="lp-footer-brand">
                            <a href="#home" className="lp-logo" style={{ display: 'inline-flex' }}
                                onClick={(e) => { e.preventDefault(); scrollTo('home'); }}>
                                <DiamondLogo />
                                <div className="lp-logo-text">
                                    <span className="lp-logo-name">GemCert Lab</span>
                                    <span className="lp-logo-tagline">Diamond Certification Authority</span>
                                </div>
                            </a>
                            <p style={{ marginTop: '1rem' }}>
                                Precision diamond grading trusted by jewellers and collectors worldwide since 1989.
                            </p>
                        </div>

                        <div className="lp-footer-nav">
                            <h4>Navigation</h4>
                            <ul>
                                {[['home', 'Home'], ['about', 'About Us'], ['services', 'Services'], ['certification', 'Certification'], ['contact', 'Contact']].map(([id, label]) => (
                                    <li key={id}>
                                        <a href={`#${id}`} onClick={(e) => { e.preventDefault(); scrollTo(id); }}>{label}</a>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="lp-footer-nav">
                            <h4>Services</h4>
                            <ul>
                                {['Diamond Grading', 'Authenticity Testing', 'Certification Reports', 'Jewellery Testing', 'Bulk Services', 'Express Certification'].map((s) => (
                                    <li key={s}><a href="#services" onClick={(e) => { e.preventDefault(); scrollTo('services'); }}>{s}</a></li>
                                ))}
                            </ul>
                        </div>

                        <div className="lp-footer-nav">
                            <h4>Portal Access</h4>
                            <ul>
                                <li><Link href="/login">Staff Sign In</Link></li>
                                <li><a href="#contact" onClick={(e) => { e.preventDefault(); scrollTo('contact'); }}>Request Access</a></li>
                                <li><a href="#contact" onClick={(e) => { e.preventDefault(); scrollTo('contact'); }}>Verify Certificate</a></li>
                            </ul>
                        </div>
                    </div>

                    <div className="lp-footer-bottom">
                        <p className="lp-footer-copy">
                            © {new Date().getFullYear()} GemCert Laboratory. All rights reserved.
                        </p>
                        <ul className="lp-footer-legal">
                            <li><a href="#">Privacy Policy</a></li>
                            <li><a href="#">Terms of Service</a></li>
                            <li><a href="#">Cookie Policy</a></li>
                        </ul>
                    </div>
                </div>
            </footer>
        </div>
    );
}
