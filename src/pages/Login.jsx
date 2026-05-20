import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, loginWithMicrosoft, loginSimulatedMicrosoft } from '../lib/auth';
import { useToast } from '../components/ToastContext';
import { Mail, Lock, LogIn, Target, Zap, ShieldAlert, ChevronRight, BarChart3, Users, CheckCircle2, Activity } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [ssoLoading, setSsoLoading] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showSsoSandbox, setShowSsoSandbox] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [tilt, setTilt] = useState({ x: 10, y: -15 });

  const handleMouseMove = (e) => {
    const card = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - card.left - card.width / 2;
    const y = e.clientY - card.top - card.height / 2;
    const tiltX = -(y / card.height) * 15 + 10;
    const tiltY = (x / card.width) * 15 - 15;
    setTilt({ x: tiltX, y: tiltY });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 10, y: -15 });
  };
  
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);

    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setShowLogin(false);
      }
    };
    window.addEventListener('keydown', handleEsc);

    // Scroll Reveal Intersection Observer
    const observerOptions = {
      threshold: 0.15,
      rootMargin: '0px 0px -60px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal-active');
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    const revealElements = document.querySelectorAll('.scroll-reveal');
    revealElements.forEach((el) => observer.observe(el));

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('keydown', handleEsc);
      observer.disconnect();
    };
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return showToast('Please enter credentials', 'warn');
    setLoading(true);
    try {
      const user = await login(email, password);
      showToast(`Welcome back, ${user.name}!`, 'success');
      navigate(user.role === 'employee' ? '/dashboard-employee' : user.role === 'manager' ? '/dashboard-manager' : '/dashboard-admin');
    } catch (err) {
      showToast('Invalid credentials. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleMicrosoftLogin = async () => {
    setSsoLoading(true);
    try {
      const user = await loginWithMicrosoft();
      showToast(`SSO Successful! Welcome ${user.name}`, 'success');
      navigate(user.role === 'employee' ? '/dashboard-employee' : user.role === 'manager' ? '/dashboard-manager' : '/dashboard-admin');
    } catch (err) {
      console.warn('Real Microsoft SSO failed, opening Entra ID Sandbox fallback modal.', err);
      setShowSsoSandbox(true);
    } finally {
      setSsoLoading(false);
    }
  };

  const handleSandboxLogin = async (demoEmail, name, role, dept) => {
    setSsoLoading(true);
    try {
      const user = await loginSimulatedMicrosoft(demoEmail, name, role, dept);
      showToast(`✨ SSO Sync Successful! Welcomed ${user.name} from Azure AD`, 'success');
      setShowSsoSandbox(false);
      setShowLogin(false);
      navigate(user.role === 'employee' ? '/dashboard-employee' : user.role === 'manager' ? '/dashboard-manager' : '/dashboard-admin');
    } catch (e) {
      showToast('Simulated SSO failed.', 'error');
    }
    setSsoLoading(false);
  };

  const useDemo = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('Demo@1234');
  };

  return (
    <div style={{ minHeight: '100vh', position: 'relative', background: 'var(--bg-primary)', overflowX: 'hidden' }}>
      
      {/* Animated Background Mesh */}
      <div className="gradient-mesh" style={{ position: 'fixed', inset: 0, zIndex: 0, opacity: 0.8 }}>
        <div className="floating-orb" style={{ animationDuration: '15s' }}></div>
        <div className="floating-orb" style={{ animationDuration: '20s', animationDelay: '-5s', width: '50vw', height: '50vw', left: '10%', top: '20%' }}></div>
        <div className="floating-orb" style={{ animationDuration: '18s', animationDelay: '-10s', width: '40vw', height: '40vw', right: '10%', top: '60%' }}></div>
      </div>

      {/* Top Navbar */}
      <nav style={{ 
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, 
        padding: '16px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: scrolled ? 'rgba(10, 10, 15, 0.8)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.05)' : '1px solid transparent',
        transition: 'all 0.3s ease'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '36px', height: '36px', background: 'var(--gradient-accent)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Activity size={18} color="#fff" />
          </div>
          <span style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.5px' }}>Nexus</span>
        </div>
        <button className="btn btn-primary" onClick={() => setShowLogin(true)} style={{ padding: '10px 24px', borderRadius: '30px' }}>
          Access Portal
        </button>
      </nav>

      <main style={{ position: 'relative', zIndex: 10, paddingTop: '120px', paddingBottom: '80px' }}>
        
        {/* HERO SECTION */}
        <section style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 40px', minHeight: '90vh', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '60px' }}>
          
          {/* Left Column: Text Content */}
          <div style={{ flex: '1', maxWidth: '650px' }}>
            <div className="scroll-reveal" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(91,95,255,0.2)', padding: '8px 16px', borderRadius: '30px', border: '1px solid rgba(91,95,255,0.4)', marginBottom: '32px', color: '#fff', fontSize: '0.95rem', fontWeight: 600, boxShadow: '0 4px 12px rgba(91,95,255,0.3)' }}>
              <Zap size={16} color="#FFD700"/> Performance Management Portal
            </div>
            
            <h1 className="scroll-reveal delay-100" style={{ fontSize: 'clamp(3rem, 5vw, 5rem)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-1px', margin: '0 0 24px 0', fontFamily: 'system-ui, sans-serif', background: 'linear-gradient(135deg, #ffffff 0%, #d0d0ff 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textShadow: '0 4px 20px rgba(91,95,255,0.2)' }}>
              Align Your Team.<br/>Accelerate Performance.
            </h1>
            
            <div className="scroll-reveal delay-200">
              <p style={{ fontSize: '1.25rem', color: '#F8F8FF', marginBottom: '16px', lineHeight: 1.6, fontWeight: 500 }}>
                <strong>Nexus is the centralized goal management platform.</strong>
              </p>
              <p style={{ fontSize: '1.15rem', color: 'rgba(255, 255, 255, 0.75)', marginBottom: '40px', lineHeight: 1.7 }}>
                It streamlines the entire organizational performance cycle: empowering employees to set annual OKRs aligned with company Thrust Areas, facilitating seamless manager approvals, enabling structured quarterly check-ins, and providing Admins with real-time analytics and automated escalation tracking.
              </p>
            </div>

            <div className="scroll-reveal delay-300" style={{ display: 'flex', gap: '16px' }}>
              <button className="btn btn-primary" onClick={() => setShowLogin(true)} style={{ padding: '16px 40px', fontSize: '1.2rem', borderRadius: '30px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 10px 30px rgba(91,95,255,0.5)', transition: 'all 0.3s ease', cursor: 'pointer' }}>
                Launch Platform <ChevronRight size={20}/>
              </button>
            </div>
          </div>

          {/* Right Column: Dashboard Mockup */}
          <div 
            className="scroll-reveal delay-400" 
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ flex: '1.2', position: 'relative', height: '600px', perspective: '1200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {/* Background Decorative Glows */}
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '400px', height: '400px', background: 'rgba(91,95,255,0.3)', filter: 'blur(100px)', borderRadius: '50%', zIndex: 1 }}></div>
            <div style={{ position: 'absolute', top: '30%', right: '10%', width: '300px', height: '300px', background: 'rgba(0,212,170,0.2)', filter: 'blur(80px)', borderRadius: '50%', zIndex: 1 }}></div>
            
            <div className="glow-card" style={{ position: 'relative', zIndex: 10, transform: `rotateY(${tilt.y}deg) rotateX(${tilt.x}deg) translateZ(50px)`, width: '110%', minWidth: '600px', background: 'rgba(25,25,35,0.9)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '24px', padding: '32px', boxShadow: '-20px 40px 100px rgba(0,0,0,0.8)', transition: 'transform 0.15s ease-out, box-shadow 0.3s ease' }}>
               
               {/* Mock UI Header */}
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '20px' }}>
                 <div>
                   <div style={{ fontSize: '1.4rem', fontWeight: 600, color: '#fff' }}>Welcome back, Sarah</div>
                   <div style={{ fontSize: '0.95rem', color: '#00D4AA', marginTop: '4px' }}>Active Cycle: FY2025-26</div>
                 </div>
                 <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                   <div style={{ background: 'rgba(255,71,87,0.2)', color: '#FF4757', padding: '6px 16px', borderRadius: '16px', fontSize: '0.85rem', fontWeight: 'bold', animation: 'pulse-danger 2s infinite' }}>2 Action Items</div>
                   <div style={{ width: '48px', height: '48px', background: 'var(--gradient-accent)', borderRadius: '50%', boxShadow: '0 0 20px rgba(91,95,255,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#fff', fontSize: '1.1rem' }}>SA</div>
                 </div>
               </div>
               
               {/* Mock UI Metrics Grid */}
               <div className="grid grid-2 gap-lg" style={{ marginBottom: '24px' }}>
                 <div style={{ background: 'linear-gradient(135deg, rgba(91,95,255,0.15) 0%, rgba(91,95,255,0.05) 100%)', borderRadius: '16px', padding: '24px', border: '1px solid rgba(91,95,255,0.3)' }}>
                   <div style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.7)', marginBottom: '12px' }}>Q1 Goal Progress</div>
                   <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#fff', marginBottom: '16px' }}>78%</div>
                   <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                     <div className="progress-fill" style={{ width: '78%', height: '100%', background: '#5B5FFF', borderRadius: '4px', boxShadow: '0 0 15px #5B5FFF', '--target-width': '78%' }}></div>
                   </div>
                 </div>

                 <div style={{ background: 'linear-gradient(135deg, rgba(0,212,170,0.15) 0%, rgba(0,212,170,0.05) 100%)', borderRadius: '16px', padding: '24px', border: '1px solid rgba(0,212,170,0.3)' }}>
                   <div style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.7)', marginBottom: '12px' }}>Team Check-ins</div>
                   <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#00D4AA', marginBottom: '16px', textShadow: '0 0 10px rgba(0,212,170,0.3)' }}>12/15</div>
                   <div style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.6)' }}>3 pending manager review</div>
                 </div>
               </div>

               {/* Mock UI Alert Row */}
               <div style={{ background: 'linear-gradient(135deg, rgba(255,165,2,0.15) 0%, rgba(255,165,2,0.05) 100%)', borderRadius: '16px', padding: '20px 24px', border: '1px solid rgba(255,165,2,0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 20px rgba(255,165,2,0.05)' }} className="hover-lift">
                 <div>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                     <ShieldAlert size={24} color="#FFA502" style={{ animation: 'shake 3s infinite' }}/>
                     <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FFA502' }}>1 Escalation Alert</span>
                   </div>
                   <div style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.6)', paddingLeft: '36px' }}>L1: Goal not submitted by J. Doe</div>
                 </div>
                 <button style={{ background: 'transparent', border: '1px solid #FFA502', color: '#FFA502', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>View</button>
               </div>
               
            </div>
          </div>
        </section>

        {/* FEATURES SECTION */}
        <section style={{ maxWidth: '1200px', margin: '100px auto 0', padding: '0 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: '64px' }} className="scroll-reveal">
            <h2 style={{ fontSize: '2.5rem', marginBottom: '16px' }}>Powerful Features Built for Modern Teams</h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.1rem' }}>Everything you need to orchestrate a high-performance organization.</p>
          </div>

          <div className="grid grid-3 gap-lg">
            {/* Feature 1 */}
            <div className="card hover-lift scroll-reveal" style={{ padding: '32px', background: 'rgba(30,30,45,0.6)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(91,95,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)', marginBottom: '24px', border: '1px solid rgba(91,95,255,0.3)' }}>
                <Target size={28}/>
              </div>
              <h3 style={{ fontSize: '1.3rem', marginBottom: '12px', color: '#fff' }}>Role-Based Workflows</h3>
              <p style={{ color: 'rgba(255,255,255,0.85)', lineHeight: 1.6 }}>Employee goal submission, manager approval & return loops, and admin cycle creation—fully separated securely via Firebase Auth and Entra ID SSO.</p>
            </div>

            {/* Feature 2 */}
            <div className="card hover-lift scroll-reveal delay-100" style={{ padding: '32px', background: 'rgba(30,30,45,0.6)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(0,212,170,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-secondary)', marginBottom: '24px', border: '1px solid rgba(0,212,170,0.3)' }}>
                <BarChart3 size={28}/>
              </div>
              <h3 style={{ fontSize: '1.3rem', marginBottom: '12px', color: '#fff' }}>Advanced Analytics</h3>
              <p style={{ color: 'rgba(255,255,255,0.85)', lineHeight: 1.6 }}>Real-time Org Heatmaps, QoQ progress tracking, dynamic score computations, and Claude AI-powered insights for Admin decision-making.</p>
            </div>

            {/* Feature 3 */}
            <div className="card hover-lift scroll-reveal delay-200" style={{ padding: '32px', background: 'rgba(30,30,45,0.6)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(255,71,87,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-danger)', marginBottom: '24px', border: '1px solid rgba(255,71,87,0.3)' }}>
                <ShieldAlert size={28}/>
              </div>
              <h3 style={{ fontSize: '1.3rem', marginBottom: '12px', color: '#fff' }}>Automated Escalations</h3>
              <p style={{ color: 'rgba(255,255,255,0.85)', lineHeight: 1.6 }}>Level 1 to Level 3 built-in escalation engine that flags missing goals or skipped check-ins automatically to upper management via Email and Teams.</p>
            </div>
          </div>
        </section>
      </main>

      {/* LOGIN MODAL */}
      <div className={`modal-overlay ${showLogin ? 'active' : ''}`} style={{ 
        backdropFilter: 'blur(10px)', 
        zIndex: 1000, 
        opacity: showLogin ? 1 : 0, 
        pointerEvents: showLogin ? 'auto' : 'none', 
        transition: 'opacity 0.3s ease' 
      }}>
        <div className="modal" style={{ 
          background: 'rgba(20,20,25,0.95)', 
          border: '1px solid rgba(255,255,255,0.1)', 
          padding: 0, 
          overflow: 'hidden',
          transform: showLogin ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(20px)',
          opacity: showLogin ? 1 : 0,
          transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          width: '100%',
          maxWidth: '450px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 32px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <h3 style={{ margin: 0 }}>Portal Access</h3>
            <button className="btn btn-ghost" onClick={() => setShowLogin(false)} style={{ padding: '8px' }}>✕</button>
          </div>
          
          <div style={{ padding: '32px' }}>
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  <Mail size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: '-2px' }}/> Email Address
                </label>
                <input type="email" className="form-input" placeholder="name@company.com" value={email} onChange={e => setEmail(e.target.value)} required style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '1rem' }}/>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  <Lock size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: '-2px' }}/> Password
                </label>
                <input type="password" className="form-input" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '1rem' }}/>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '16px', padding: '14px' }} disabled={loading}>
                {loading ? <div className="spinner" style={{ width: '20px', height: '20px' }}></div> : <><LogIn size={18} /> Authenticate</>}
              </button>
            </form>
            
            <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0' }}>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
              <span style={{ padding: '0 12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>OR</span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
            </div>

            <button 
              type="button"
              className="btn btn-secondary" 
              onClick={handleMicrosoftLogin}
              style={{ width: '100%', padding: '14px', background: '#0078D4', borderColor: '#0078D4', color: '#fff', display: 'flex', justifyContent: 'center', gap: '8px' }} 
              disabled={ssoLoading}
            >
              {ssoLoading ? <div className="spinner" style={{ width: '20px', height: '20px', borderColor: '#fff', borderTopColor: 'transparent' }}></div> : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 21 21"><path fill="#f35325" d="M0 0h10v10H0z"/><path fill="#81bc06" d="M11 0h10v10H11z"/><path fill="#05a6f0" d="M0 11h10v10H0z"/><path fill="#ffba08" d="M11 11h10v10H11z"/></svg>
                  Sign in with Microsoft Entra ID
                </>
              )}
            </button>

            <div style={{ marginTop: '32px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '24px' }}>
              <p style={{ fontSize: '0.75rem', textAlign: 'center', marginBottom: '16px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Quick Demo Access</p>
              <div className="grid grid-3 gap-sm" style={{ marginBottom: '8px' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => useDemo('employee@demo.nexus.com')} style={{ padding: '8px', fontSize: '0.8rem' }}><Users size={14} style={{ marginRight:'4px' }}/> Employee 1</button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => useDemo('manager@demo.nexus.com')} style={{ padding: '8px', fontSize: '0.8rem' }}><CheckCircle2 size={14} style={{ marginRight:'4px' }}/> Manager</button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => useDemo('admin@demo.nexus.com')} style={{ padding: '8px', fontSize: '0.8rem' }}><ShieldAlert size={14} style={{ marginRight:'4px' }}/> Admin</button>
              </div>
              <div className="grid grid-2 gap-sm">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => useDemo('employee2@demo.nexus.com')} style={{ padding: '8px', fontSize: '0.8rem' }}><Users size={14} style={{ marginRight:'4px' }}/> Emp 2 (Approved)</button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => useDemo('employee3@demo.nexus.com')} style={{ padding: '8px', fontSize: '0.8rem' }}><Users size={14} style={{ marginRight:'4px' }}/> Emp 3 (Draft)</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MICROSOFT ENTRA ID SSO SANDBOX MODAL */}
      <div className={`modal-overlay ${showSsoSandbox ? 'active' : ''}`} style={{ 
        backdropFilter: 'blur(12px)', 
        zIndex: 1100, 
        opacity: showSsoSandbox ? 1 : 0, 
        pointerEvents: showSsoSandbox ? 'auto' : 'none', 
        transition: 'opacity 0.3s ease' 
      }}>
        <div className="modal" style={{ 
          background: 'rgba(20,20,25,0.98)', 
          border: '1px solid rgba(0, 120, 212, 0.4)', 
          padding: 0, 
          overflow: 'hidden',
          transform: showSsoSandbox ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(20px)',
          opacity: showSsoSandbox ? 1 : 0,
          transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          width: '100%',
          maxWidth: '480px',
          boxShadow: '0 20px 50px rgba(0, 120, 212, 0.25)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 32px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'linear-gradient(90deg, rgba(0,120,212,0.1) 0%, transparent 100%)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 21 21"><path fill="#f35325" d="M0 0h10v10H0z"/><path fill="#81bc06" d="M11 0h10v10H11z"/><path fill="#05a6f0" d="M0 11h10v10H0z"/><path fill="#ffba08" d="M11 11h10v10H11z"/></svg>
              <h3 style={{ margin: 0, color: '#fff' }}>Microsoft Entra ID Sandbox</h3>
            </div>
            <button className="btn btn-ghost" onClick={() => setShowSsoSandbox(false)} style={{ padding: '8px' }}>✕</button>
          </div>
          
          <div style={{ padding: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(0,120,212,0.1)', border: '1px solid rgba(0,120,212,0.2)', padding: '16px', borderRadius: '12px', marginBottom: '24px' }}>
              <ShieldAlert size={28} color="#0078D4" />
              <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', lineHeight: 1.4 }}>
                <strong>SSO Simulation Active:</strong> Microsoft OIDC integration is in mock mode. Select an Entra ID identity to simulate authentic AD claim & department group synchronization.
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => handleSandboxLogin('employee@demo.nexus.com', 'Arjun Sharma', 'employee', 'Engineering')}
                style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.1)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#5B5FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>AS</div>
                  <div>
                    <div style={{ fontWeight: 600, color: '#fff' }}>Arjun Sharma</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>arjun.sharma@entra.nexus.com</div>
                  </div>
                </div>
                <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>Employee</span>
              </button>

              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => handleSandboxLogin('manager@demo.nexus.com', 'Priya Iyer', 'manager', 'Sales')}
                style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.1)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#00D4AA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>PI</div>
                  <div>
                    <div style={{ fontWeight: 600, color: '#fff' }}>Priya Iyer</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>priya.iyer@entra.nexus.com</div>
                  </div>
                </div>
                <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>Manager</span>
              </button>

              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => handleSandboxLogin('admin@demo.nexus.com', 'Meera Reddy', 'admin', 'Human Resources')}
                style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.1)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#FF4757', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>MR</div>
                  <div>
                    <div style={{ fontWeight: 600, color: '#fff' }}>Meera Reddy</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>meera.reddy@entra.nexus.com</div>
                  </div>
                </div>
                <span className="badge badge-submitted" style={{ fontSize: '0.65rem', background: '#FF4757', color: '#fff' }}>Admin</span>
              </button>
            </div>
            
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '24px', lineHeight: 1.4 }}>
              Upon selection, the platform simulates Microsoft Graph Directory claims mapping and provisions the user identity in Firestore.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
