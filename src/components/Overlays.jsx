import React, { useState, useEffect, useRef } from 'react';
import { sbGet, sbPost, hasSupabase, supabase, sbWatchTable } from '../services/supabase';
import { SKINS_DB, LiveSkinPreview } from './MetaShop';
import Bestiary from './Bestiary';

export default function Overlays({ 
  screen, 
  setScreen, 
  hudData, 
  roomCode, 
  p2Status, 
  isCoop, 
  initialWizardName,
  levelUpOptions, 
  onSelectUpgrade, 
  onAction 
}) {
  const [wizardName, setWizardName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [leaderboard, setLeaderboard] = useState([]);
  const [loadingLb, setLoadingLb] = useState(false);
  const [submitStatus, setSubmitStatus] = useState('');
  const [isScoreSubmitted, setIsScoreSubmitted] = useState(false);
  const [leaderboardTab, setLeaderboardTab] = useState('solo');

  // States para sa Dynamic Supabase Council News Modal Window
  const [councilNewsOpen, setCouncilNewsOpen] = useState(false);
  const [councilTab, setCouncilTab] = useState('decrees'); // 'decrees' o 'grimoire'
  const [newsData, setNewsData] = useState([]);
  const [loadingNews, setLoadingNews] = useState(false);

  const [voidCrystals, setVoidCrystals] = useState(0);
  const [gameOverPhase, setGameOverPhase] = useState('continue');  

  const [showDamageRecap, setShowDamageRecap] = useState(false);
  const [showLoreVideo, setShowLoreVideo] = useState(false);
  const [showGrimoireModal, setShowGrimoireModal] = useState(false);
  const [grimoirePage, setGrimoirePage] = useState('cover'); // 'cover' | 'video'
  const [grimoireVideoPlaying, setGrimoireVideoPlaying] = useState(false);
  const [isIdleTransitioning, setIsIdleTransitioning] = useState(false);
  // 🌌 Universal Transition State
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [activeGrimoireTab, setActiveGrimoireTab] = useState('lore');
  const upgradeLockRef = useRef(false);

  useEffect(() => {
    if (screen === 'levelup') {
      upgradeLockRef.current = false;
    }
  }, [screen]);

  // 🪄 Helper function para sa Frieren effect
  const executeWithTransition = (callback) => {
    setIsTransitioning(true); // I-trigger ang animation
    setTimeout(() => {
      callback(); // Patakbuhin ang action (setScreen o onAction) pagkatapos ng 1 second
      setIsTransitioning(false); // I-reset para mawala ang dark overlay sa bagong screen
    }, 1000);
  };

useEffect(() => {
    if (screen === 'levelup' || screen === 'gameover') {
      setVoidCrystals(parseInt(localStorage.getItem('arcane_void_crystals') || '0', 10));
    }
    if (screen === 'gameover') {
      // 🔥 CHECK FLAG: Kung naka-continue na siya sa run na ito, diretso sa summary
      if (hudData?.p?.hasContinued) {
        setGameOverPhase('summary');
      } else {
        setGameOverPhase('continue');
      }
    }
  }, [screen, levelUpOptions]);

  const handleReroll = (e) => {
    e.stopPropagation();
    if (upgradeLockRef.current) return; // 🛑 PIGILAN ANG SPAM

    const REROLL_COST = 50; 
    let currentCrystals = parseInt(localStorage.getItem('arcane_void_crystals') || '0', 10);
    
    if (currentCrystals >= REROLL_COST) {
      upgradeLockRef.current = true; // 🔒 I-LOCK HABANG NAG-REROLL

      currentCrystals -= REROLL_COST;
      localStorage.setItem('arcane_void_crystals', currentCrystals);
      setVoidCrystals(currentCrystals);
      
      if (window.requestLevelUpReroll) {
        window.requestLevelUpReroll();
      }

      // 🔓 I-unlock agad pagkatapos ng maliit na delay para makapili na ulit ng cards
      setTimeout(() => {
         upgradeLockRef.current = false;
      }, 100);
    }
  };

  // I-sync ang local field kapag may nakuhang global name prop galing sa App level
  useEffect(() => {
    if (initialWizardName) {
      setWizardName(initialWizardName);
    }
  }, [initialWizardName]);

// 🔥 FIX 1: Basahin agad ang huling alam na status mula sa localStorage para iwas visual flash
  const [coopActiveInDb, setCoopActiveInDb] = useState(() => {
    const cached = localStorage.getItem('arcane_coop_enabled');
    return cached === null ? null : cached === 'true';
  });

 // 🕒 180 SECONDS IDLE DETECTION
  useEffect(() => {
    let timeoutId;

    const resetIdleTimer = () => {
      clearTimeout(timeoutId);
      // Tatakbo lang timer kung nasa 'menu' at hindi pa nagta-transition
      if (screen === 'menu' && !isTransitioning) {
        timeoutId = setTimeout(() => {
          // Gagamitin na natin ang helper function dito!
          executeWithTransition(() => setScreen('intro'));
        }, 180000); // 180 SECONDS
      }
    };

    const handleUserActivity = () => resetIdleTimer();

    if (screen === 'menu') {
      window.addEventListener('mousemove', handleUserActivity);
      window.addEventListener('keydown', handleUserActivity);
      window.addEventListener('touchstart', handleUserActivity);
      window.addEventListener('click', handleUserActivity);
      resetIdleTimer(); 
    } else {
      clearTimeout(timeoutId);
    }

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
      window.removeEventListener('click', handleUserActivity);
    };
  }, [screen, isTransitioning, setScreen]);

  useEffect(() => {
    const fetchCoopStatus = () => {
      sbGet('/rest/v1/game_settings?id=eq.1')
        .then(data => {
          if (data && data.length > 0) {
            const status = data[0].coop_enabled;
            setCoopActiveInDb(status);
            // I-save sa local cache para sa susunod na rapid refresh ng player
            localStorage.setItem('arcane_coop_enabled', String(status)); 
          } else {
            setCoopActiveInDb(false);
            localStorage.setItem('arcane_coop_enabled', 'false');
          }
        })
        .catch(err => {
          console.error('Error loading game settings:', err);
          // Kung walang internet pero may lumang cache, panatilihin muna; kung wala, i-lock sa false
          if (localStorage.getItem('arcane_coop_enabled') === null) {
            setCoopActiveInDb(false);
          }
        });
    };

    // INITIAL FETCH
    fetchCoopStatus();

    // REALTIME CONNECTION
    const watcher = sbWatchTable('game_settings', () => {
      fetchCoopStatus(); 
    });

    return () => watcher.close();
  }, []);

// 🔊 AWTOMATIKONG CLICK SOUND EFFECT PARA SA LAHAT NG BUTTONS
  useEffect(() => {
    // Helper function para mag-play ng audio nang hindi napuputol
    const playSound = (src, volume = 0.5) => {
      const audio = new Audio(src);
      audio.volume = volume;
      audio.play().catch(() => {});
    };

    const handleClick = (e) => {
      // Targetin lahat ng <button> at pati na rin ang custom thumbnails ng Grimoire
      if (e.target.closest('button') || e.target.closest('.grimoire-video-thumb')) {
        playSound('/btn-click.mp3', 0.6); 
      }
    };

    // 🔥 Idinagdag ang 'true' para saluhin agad ang click signal BAGO pa gumana ang stopPropagation
    document.addEventListener('click', handleClick, true);

    return () => {
      document.removeEventListener('click', handleClick, true);
    };
  }, []);

useEffect(() => {
    if (screen === 'leaderboard') {
      // Create a fetch function that accepts a 'silent' parameter
      const fetchLeaderboard = (isSilent = false) => {
        if (!isSilent) setLoadingLb(true);
        
        // Added mode filter to the endpoint based on the active tab
        sbGet(`/rest/v1/leaderboard?select=name,score,wave,level,mode,skin&mode=eq.${leaderboardTab}&order=score.desc&limit=20`)
          .then(data => { 
            setLeaderboard(data || []); 
            if (!isSilent) setLoadingLb(false); 
          })
          .catch(() => {
            if (!isSilent) setLoadingLb(false);
          });
      };

      // Initial fetch when screen opens or tab changes
      fetchLeaderboard(false);

      // Start Realtime connection
      const watcher = sbWatchTable('leaderboard', () => {
        // Silently fetch new data when someone else updates their score
        fetchLeaderboard(true); 
      });

      // Cleanup websocket connection when leaving or swapping tabs
      return () => watcher.close();
    }
    
    if (screen !== 'gameover') {
      setSubmitStatus('');
      setIsScoreSubmitted(false);
    }
  }, [screen, leaderboardTab]); // Added leaderboardTab to dependencies

  useEffect(() => {
    if (councilNewsOpen) {
      const fetchNews = (isSilent = false) => {
        if (!isSilent) setLoadingNews(true);
        sbGet('/rest/v1/council_news?select=*&order=created_at.desc')
          .then(data => {
            setNewsData(data || []);
            if (!isSilent) setLoadingNews(false);
          })
          .catch(() => {
            if (!isSilent) setLoadingNews(false);
          });
      };

      // Initial fetch
      fetchNews(false);

      // Start Realtime connection
      const watcher = sbWatchTable('council_news', () => {
        // Silently refresh if an admin adds a new log
        fetchNews(true);
      });

      // Cleanup websocket when closing the modal
      return () => watcher.close();
    }
  }, [councilNewsOpen]);

  useEffect(() => {
    if (screen !== 'levelup') return;
    
    const handleHotkey = (e) => {

      if (upgradeLockRef.current) return;

      if (['1', '2', '3'].includes(e.key)) {
        const index = parseInt(e.key, 10) - 1;
        const choices = levelUpOptions || [];
        if (choices[index]) {
          upgradeLockRef.current = true;
          onSelectUpgrade(choices[index]);
        }
      }
    };

    window.addEventListener('keydown', handleHotkey);
    return () => window.removeEventListener('keydown', handleHotkey);
  }, [screen, levelUpOptions, onSelectUpgrade]);

const handleSubmitScore = async () => {
    const nameToSubmit = wizardName.trim();
    if (!nameToSubmit) return alert('Enter Arcane Identity first');
    
    const newScore = hudData?.score || 0;
    if (newScore <= 0) {
      setSubmitStatus('Score must be greater than 0 to be recorded.');
      return;
    }

    // 🔥 KUNIN ANG CURRENT SKIN NA SUOT NG PLAYER
    const currentSkin = localStorage.getItem('arcane_equipped_skin') || 'default';

    setSubmitStatus('Checking ancient records...');

    try {
      const existingData = await sbGet(`/rest/v1/leaderboard?select=id,score&name=ilike.${encodeURIComponent(nameToSubmit)}`);

      if (existingData && existingData.length > 0) {
        const existingRecord = existingData[0];

        if (newScore > existingRecord.score) {
          setSubmitStatus('New personal best! Overwriting old record...');
          
          const { error } = await supabase
            .from('leaderboard')
            .update({ 
              score: newScore, 
              wave: hudData?.wave || 1, 
              level: hudData?.p?.level || 1,
              mode: isCoop ? 'coop' : 'solo',
              skin: currentSkin // 🔥 ISINAMA ANG SKIN ID SA DATABASE
            })
            .eq('id', existingRecord.id);

          if (!error) {
            setSubmitStatus(`✦ New personal best! Overwrote previous score.`);
            setIsScoreSubmitted(true);
          }
        } else {
          setSubmitStatus(`A higher record already exists.`);
        }
      } else {
        const ok = await sbPost('/rest/v1/leaderboard', {
          name: nameToSubmit, 
          score: newScore, 
          wave: hudData?.wave || 1, 
          level: hudData?.p?.level || 1, 
          mode: isCoop ? 'coop' : 'solo',
          skin: currentSkin // 🔥 ISINAMA ANG SKIN ID SA DATABASE
        });
        
        if (ok) {
          setSubmitStatus('✦ Name etched into the Tombstone successfully!');
          setIsScoreSubmitted(true);
        }
      }
    } catch (err) {
      setSubmitStatus('Failed to access the Tombstone. Try again.');
    }
  };

// ============================================================================
// 🜂 CUSTOM ARCANE UPGRADE ICONS — Pure inline SVG (vector, no emoji/image
// loading, no animation loop). Lightweight at GPU-friendly, zero impact sa
// game performance kahit ilang beses na re-render ang level up modal.
// ============================================================================
const IconVortex = () => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 4C9.373 4 4 9.373 4 16s5.373 12 12 12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    <path d="M16 8c-4.418 0-8 3.582-8 8s3.582 8 8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
    <path d="M16 12c-2.21 0-4 1.79-4 4s1.79 4 4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity="0.5" />
    <circle cx="16" cy="16" r="1.6" fill="currentColor" />
  </svg>
);

const IconFlame = () => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 3c2 4-2 6-2 10a4 4 0 008 0c0-1.4-.5-2.3-1-3 .3 2-.8 3.4-2.2 3.4-1.6 0-2.6-1.3-2.6-2.9C16.2 8 18 6.6 16 3z" fill="currentColor" />
    <path d="M16 29c5.5 0 10-3.8 10-8.6 0-3.2-1.6-5.4-3.2-7 .7 3.4-1.4 5.9-4.3 5.9-2.9 0-4.8-2.1-4.8-4.9 0-1.7.7-2.9 1.4-3.8-3.9 1.9-6.7 5.6-6.7 9.8 0 4.8 3.9 8.6 7.6 8.6z" fill="currentColor" opacity="0.85" />
  </svg>
);

const IconHeart = () => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 28s-11-6.8-11-15.2C5 8.6 8.1 5 12 5c2 0 3.6 1 4 2.4C16.4 6 18 5 20 5c3.9 0 7 3.6 7 7.8C27 21.2 16 28 16 28z" fill="currentColor" />
    <path d="M16 11l1.4 3h3l-2.4 2.1.9 3.1L16 17.4 13.1 19.2l.9-3.1L11.6 14h3z" fill="#1a0b2e" opacity="0.65" />
  </svg>
);

const IconWand = () => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="14.4" y="13" width="3.2" height="16" rx="1.4" fill="currentColor" transform="rotate(45 16 21)" />
    <path d="M16 3l1.2 3.2 3.2 1.2-3.2 1.2L16 11.8l-1.2-3.2-3.2-1.2 3.2-1.2L16 3z" fill="currentColor" />
    <circle cx="23" cy="9" r="1.1" fill="currentColor" />
    <circle cx="9" cy="9" r="0.9" fill="currentColor" opacity="0.7" />
  </svg>
);

const IconWind = () => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 11h16a3 3 0 10-2.8-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M4 16h20a3.2 3.2 0 11-3 4.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M4 21h13a2.4 2.4 0 11-2.2 3.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const IconDagger = () => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 3l2.4 9.6h-4.8L16 3z" fill="currentColor" />
    <rect x="15" y="12.6" width="2" height="10.4" fill="currentColor" />
    <rect x="11" y="21" width="10" height="2.2" rx="1" fill="currentColor" />
    <path d="M16 23.2v5.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const IconShield = () => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 3l10 3.6v8c0 7.4-4.6 12-10 14.4C10.6 26.6 6 22 6 14.6v-8L16 3z" fill="currentColor" opacity="0.92" />
    <path d="M16 8l5.4 2v5.4c0 4-2.4 6.8-5.4 8.2-3-1.4-5.4-4.2-5.4-8.2V10L16 8z" fill="#1a0b2e" opacity="0.55" />
  </svg>
);

const IconBat = () => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 11c-2-4-7-6-12-5 3 1.4 4.6 3.4 5.2 5.4-2.4 0-4.6 1-6.2 3 3 .2 5 1.4 6.2 2.8-1.6.6-2.8 1.8-3.4 3 2.6 0 5-.8 6.8-2.4.6 1.4 1.8 2.6 3.4 3.2 1.6-.6 2.8-1.8 3.4-3.2 1.8 1.6 4.2 2.4 6.8 2.4-.6-1.2-1.8-2.4-3.4-3 1.2-1.4 3.2-2.6 6.2-2.8-1.6-2-3.8-3-6.2-3 .6-2 2.2-4 5.2-5.4-5 0-10 1-12 5z" fill="currentColor" />
    <circle cx="14" cy="14.5" r="0.6" fill="#1a0b2e" />
    <circle cx="18" cy="14.5" r="0.6" fill="#1a0b2e" />
  </svg>
);

const IconScroll = () => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="7" y="6" width="18" height="20" rx="2" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="1.4" />
    <path d="M11 11h10M11 15h10M11 19h7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <circle cx="7" cy="9" r="2.2" fill="currentColor" />
    <circle cx="7" cy="23" r="2.2" fill="currentColor" />
    <circle cx="25" cy="9" r="2.2" fill="currentColor" />
    <circle cx="25" cy="23" r="2.2" fill="currentColor" />
  </svg>
);

const IconTrophy = () => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 5h12v6.4a6 6 0 01-12 0V5z" fill="currentColor" opacity="0.16" stroke="currentColor" strokeWidth="1.6" />
    <path d="M10 7.2H6.4a2.6 2.6 0 000 5.2H10M22 7.2h3.6a2.6 2.6 0 010 5.2H22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M16 17.4v4.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M10.5 26h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M16 21.8c-2.2 0-4 1.2-4.4 4.2h8.8c-.4-3-2.2-4.2-4.4-4.2z" fill="currentColor" />
  </svg>
);

const IconWizardHat = () => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 4l6.6 17.2H9.4L16 4z" fill="currentColor" opacity="0.18" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    <ellipse cx="16" cy="22.4" rx="9.4" ry="2.2" stroke="currentColor" strokeWidth="1.6" fill="none" />
    <path d="M16 4c1.4 2.4 1 4-1 5.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" fill="none" />
    <circle cx="19.2" cy="11.6" r="1" fill="currentColor" />
  </svg>
);

const IconSwordsCrossed = () => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <line x1="6" y1="6" x2="22" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M22 22l3.2-1.8-1.2 5-2-3.2z" fill="currentColor" />
    <line x1="26" y1="6" x2="10" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M10 22l-3.2-1.8 1.2 5 2-3.2z" fill="currentColor" />
  </svg>
);


const IconMegaphone = () => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M5 13v6h5l10 5V8L10 13H5z" fill="currentColor" opacity="0.18" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M22 11.4a5.6 5.6 0 010 9.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.75" />
    <path d="M8 19l1.4 5.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const IconSparkleStar = () => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 3l2 9.5L28 15l-10 2.5L16 27l-2-9.5L4 15l10-2.5L16 3z" fill="currentColor" opacity="0.9" />
  </svg>
);

// ============================================================================
// 🜂 CUSTOM IN-GAME UI ICONS — Pure inline SVG (gameover, level-up, damage
// recap). Kapalit ng dating emoji icons sa loob mismo ng game.
// ============================================================================
const IconWarningRune = () => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 4L29.5 27H2.5L16 4z" fill="currentColor" opacity="0.18" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    <rect x="14.7" y="12.4" width="2.6" height="8" rx="1.3" fill="currentColor" />
    <circle cx="16" cy="23.2" r="1.5" fill="currentColor" />
  </svg>
);

const IconVoidCrystal = () => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 12L16 4l10 8-10 16L6 12z" fill="currentColor" opacity="0.85" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    <path d="M6 12h20M11 12L16 4M21 12L16 4M16 12l-3.5 8M16 12l3.5 8" stroke="#1a0b2e" strokeWidth="1" opacity="0.4" />
  </svg>
);

const IconRuneDie = () => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="5" y="5" width="22" height="22" rx="4" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="1.8" />
    <circle cx="11" cy="11" r="1.8" fill="currentColor" />
    <circle cx="21" cy="11" r="1.8" fill="currentColor" />
    <circle cx="16" cy="16" r="1.8" fill="currentColor" />
    <circle cx="11" cy="21" r="1.8" fill="currentColor" />
    <circle cx="21" cy="21" r="1.8" fill="currentColor" />
  </svg>
);

const IconReturnArrow = () => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22 10H13a7 7 0 100 14h6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    <path d="M16 5l-6 5 6 5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconRecapChart = () => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="5" y="18" width="5" height="9" fill="currentColor" opacity="0.7" />
    <rect x="13.5" y="11" width="5" height="16" fill="currentColor" />
    <rect x="22" y="6" width="5" height="21" fill="currentColor" opacity="0.85" />
    <path d="M3 27h26" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

const IconSpectateEye = () => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 16s5-9 13-9 13 9 13 9-5 9-13 9-13-9-13-9z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    <circle cx="16" cy="16" r="4.2" fill="currentColor" />
    <circle cx="16" cy="16" r="1.4" fill="#1a0b2e" />
  </svg>
);

const IconRestartCycle = () => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 14a10 10 0 0117-6.3" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    <path d="M26 18a10 10 0 01-17 6.3" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    <path d="M23 4v6h-6M9 28v-6h6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconSanctumHome = () => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 15L16 5l12 10" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M7 13v13h18V13" fill="currentColor" opacity="0.18" stroke="currentColor" strokeWidth="1.8" />
    <rect x="13.5" y="18" width="5" height="8" fill="currentColor" />
  </svg>
);

const IconBloodDrop = () => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 4c5 7 9 12.4 9 17a9 9 0 11-18 0c0-4.6 4-10 9-17z" fill="currentColor" opacity="0.9" />
    <path d="M12 20a5 5 0 003 4.6" stroke="#1a0b2e" strokeWidth="1.4" strokeLinecap="round" opacity="0.4" fill="none" />
  </svg>
);

const IconFairyWings = () => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 14c-2-6-8-9-13-7 2 3 2 8 6 10-3 1-5 4-5 7 5 0 9-2 11-6 1 3 1 5 1 5s0-2 1-5c2 4 6 6 11 6 0-3-2-6-5-7 4-2 4-7 6-10-5-2-11 1-13 7z" fill="currentColor" opacity="0.8" />
    <circle cx="16" cy="15.5" r="2.2" fill="currentColor" />
  </svg>
);

const IconHolyShield = () => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="16" cy="6.5" rx="5.5" ry="3" stroke="currentColor" strokeWidth="1.6" opacity="0.85" />
    <path d="M16 11l9 3.2v6.8c0 5.8-3.8 9.4-9 11.4-5.2-2-9-5.6-9-11.4v-6.8L16 11z" fill="currentColor" opacity="0.85" />
    <path d="M16 15l4.6 1.6v4.8c0 3.2-2 5.2-4.6 6.4-2.6-1.2-4.6-3.2-4.6-6.4v-4.8L16 15z" fill="#1a0b2e" opacity="0.45" />
  </svg>
);

const IconVoidSwirl = () => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="16" cy="16" r="12" fill="currentColor" opacity="0.12" />
    <path d="M16 6a10 10 0 11-9.8 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.8" />
    <circle cx="16" cy="16" r="2.4" fill="currentColor" />
    <circle cx="9" cy="10" r="1" fill="currentColor" opacity="0.7" />
    <circle cx="24" cy="20" r="1.3" fill="currentColor" opacity="0.6" />
  </svg>
);

// Reusable wrapper para sa lahat ng inline icons sa text (consistent sizing/alignment)
const InlineIcon = ({ children, size = 15, style }) => (
  <span style={{ width: size, height: size, display: 'inline-flex', verticalAlign: '-2px', marginRight: '6px', flexShrink: 0, ...style }}>
    {children}
  </span>
);

const getUpgradeMeta = (rawString, wave = 1) => {
    const normalize = String(rawString || '').toLowerCase().trim();
    
    // 🔥 DYNAMIC SCALING FORMULAS
    const dmgBoost = 14 + Math.floor(wave * 1.5); 
    const hpBoost = 50 + Math.floor(wave * 4.0);  
    const spdBoost = 10 + Math.floor(wave * 1.2);
    
    // 👇 BAGONG FORMULAS PARA SA CRIT AT DEFENSE (+5% base, pataas nang pataas)
    const critBoost = 5 + Math.floor(wave * 0.2);
    const defBoost = 4 + Math.floor(wave * 0.2);
    const lifestealBoost = 5 + Math.floor(wave * 0.2);

    if (normalize.includes('rate') || normalize.includes('rapid') || normalize.includes('fire')) {
      return { icon: <IconVortex />, title: 'RAPID FIRE', desc: 'ATTACK COOLDOWN RATE -0.1s (CAP: 0.15s)' };
    }
    if (normalize.includes('damage') || normalize.includes('might') || normalize.includes('increase')) {
      return { icon: <IconFlame />, title: 'ARCANE MIGHT', desc: `BOLT DAMAGE +${dmgBoost} POINTS` };
    }
    if (normalize.includes('hp') || normalize.includes('vitality') || normalize.includes('max')) {
      return { icon: <IconHeart />, title: 'VITALITY', desc: `MAX HP +${hpBoost} & FULL HEAL` };
    }
    if (normalize.includes('multi') || normalize.includes('shot') || normalize.includes('gain') || normalize.includes('-')) {
      return { icon: <IconWand />, title: 'SPLIT BOLT', desc: 'FIRE AN ADDITIONAL PROJECTILE (CAP: 20)' };
    }
    if (normalize.includes('swift') || normalize.includes('speed') || normalize.includes('stride')) {
      return { icon: <IconWind />, title: 'SWIFT STRIDE', desc: `MOVEMENT SPEED +${spdBoost} (CAP: 800)` };
    }
    if (normalize.includes('crit') || normalize.includes('fatal') || normalize.includes('strike')) {
      return { icon: <IconDagger />, title: 'FATAL STRIKE', desc: `CRIT CHANCE +${critBoost}% (CAP: 60%)` };
    }
    if (normalize.includes('def') || normalize.includes('armor') || normalize.includes('plating')) {
      return { icon: <IconShield />, title: 'IRON PLATING', desc: `ARMOR RATING +${defBoost}` };
    }
    if (normalize.includes('vampiric') || normalize.includes('aura') || normalize.includes('life')) {
      return { icon: <IconBat />, title: 'VAMPIRIC AURA', desc: `HEAL ${lifestealBoost} HP PER ENEMY KILLED` };
    }
    return { icon: <IconScroll />, title: String(rawString).toUpperCase(), desc: 'ARCANE COVENANT BLESSING' };
  };

  if (screen === 'playing') return null;

  const displayedChoices = (levelUpOptions || []).slice(0, 3);
  const restartVotes = isCoop ? [hudData?.coopVotes?.p1, hudData?.coopVotes?.p2].filter(Boolean).length : 0;

  const activeLogs = newsData.filter(item => 
    councilTab === 'decrees' ? item.type === 'decree' : item.type === 'grimoire'
  );

  const formatDamage = (num) => {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return Math.floor(num).toLocaleString();
  };

const renderDamageRecap = () => {
    const metrics = window.arcaneDamageMetrics || {};
    const damageTaken = window.arcaneDamageTaken || 0;
    const utility = window.arcaneUtilityMetrics || {};
    
    // Kunin ang grand total
    const totalDamage = Object.values(metrics).reduce((sum, dmg) => sum + dmg, 0);

    if (totalDamage === 0) {
      return <div style={{ color: '#9ca3af', textAlign: 'center', margin: '20px 0' }}>The Void consumed you before you could strike.</div>;
    }

    // 🔥 I-GROUP ANG DATA
    const grouped = {
      'Basic Attack': [],
      'Spells & Skills': [],
      'Familiars': []
    };

    // 🔥 LISTAHAN NG LAHAT NG FAMILIARS PARA SURE CATCH
    const familiarNames = [
      'Ignis Wisp', 'Frost Sprite', 'Zephyr Falcon', 
      'Stone Golem', 'Spark Fox', 'Umbral Bat'
    ];

    Object.entries(metrics).forEach(([source, dmg]) => {
      if (source === 'Basic Attack') {
        grouped['Basic Attack'].push({ source, dmg });
      } else if (source.startsWith('Familiar:') || familiarNames.includes(source)) {
        // Saluhin kung may 'Familiar: ' man sa unahan O KAYA nasa listahan sa taas
        const cleanName = source.replace('Familiar: ', '');
        grouped['Familiars'].push({ source: cleanName, dmg });
      } else {
        grouped['Spells & Skills'].push({ source, dmg });
      }
    });

    // I-sort ang bawat group (Highest damage sa taas)
    Object.keys(grouped).forEach(k => {
       grouped[k].sort((a, b) => b.dmg - a.dmg);
    });

    return (
      <div style={{ maxHeight: '280px', overflowY: 'auto', paddingRight: '10px', marginTop: '15px' }}>
        
        <div style={{ textAlign: 'center', color: '#f87171', fontWeight: '900', marginBottom: '4px', fontSize: '1.2rem', letterSpacing: '2px' }}>
          TOTAL DAMAGE DEALT: {formatDamage(totalDamage)}
        </div>
        <div style={{ textAlign: 'center', color: '#94a3b8', fontWeight: 'bold', marginBottom: '18px', fontSize: '0.8rem', fontFamily: 'monospace', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <InlineIcon size={14} style={{ color: '#f87171' }}><IconBloodDrop /></InlineIcon>DAMAGE TAKEN: <span style={{ color: '#fca5a5' }}> {formatDamage(damageTaken)}</span>
        </div>

        {/* 🔥 RENDER BAWAT CATEGORY */}
        {['Basic Attack', 'Spells & Skills', 'Familiars'].map(category => {
          if (grouped[category].length === 0) return null; // Wag ipakita kung walang laman
          
          // Compute ng total per category
          const catTotal = grouped[category].reduce((sum, item) => sum + item.dmg, 0);
          const catPercent = ((catTotal / totalDamage) * 100).toFixed(1);

          return (
            <div key={category} style={{ marginBottom: '15px', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              
              {/* CATEGORY HEADER */}
              <div style={{ color: '#cbd5e1', fontSize: '0.8rem', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '6px', marginBottom: '10px', letterSpacing: '1px', display: 'flex', justifyContent: 'space-between' }}>
                <span>{category.toUpperCase()}</span>
                <span style={{ color: '#94a3b8' }}>{formatDamage(catTotal)} ({catPercent}%)</span>
              </div>

              {/* MGA SKILLS/ITEMS SA LOOB NG CATEGORY */}
              {grouped[category].map(({ source, dmg }) => {
                const percent = ((dmg / totalDamage) * 100).toFixed(1);
                const isFamiliar = category === 'Familiars';
                const isBasic = category === 'Basic Attack';
                
                return (
                  <div key={source} style={{ marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#e2e8f0', marginBottom: '4px', fontFamily: 'monospace' }}>
                      <span>{source}</span>
                      <span style={{ color: '#fbbf24' }}>{formatDamage(dmg)}</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ 
                        height: '100%', 
                        width: `${percent}%`, 
                        background: isBasic ? 'linear-gradient(90deg, #64748b, #94a3b8)' : 
                                    isFamiliar ? 'linear-gradient(90deg, #ea580c, #facc15)' : 
                                    source === 'Body Cutter' ? 'linear-gradient(90deg, #b91c1c, #f43f5e)' :
                                    source === 'Shooting Star' ? 'linear-gradient(90deg, #2563eb, #60a5fa)' :
                                    source === 'Cube Bash' ? 'linear-gradient(90deg, #059669, #34d399)' :
                                    source === 'Vacuum Slash' ? 'linear-gradient(90deg, #d97706, #fbbf24)' :
                                    'linear-gradient(90deg, #7c3aed, #d946ef)',
                        boxShadow: !isBasic ? `0 0 8px ${isFamiliar ? 'rgba(250, 204, 21, 0.4)' : 'rgba(217, 70, 239, 0.4)'}` : 'none',
                        borderRadius: '2px'
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* 🔥 SUPPORT & UTILITY STATS BOX (NAKASINGIT SA PINAKA-ILALIM) */}
        {(utility['Fairy Heal'] > 0 || utility['Light Shield'] > 0 || utility['Voidling Loot'] > 0) && (
            <div style={{ marginBottom: '15px', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              
              <div style={{ color: '#cbd5e1', fontSize: '0.8rem', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '6px', marginBottom: '10px', letterSpacing: '1px' }}>
                SUPPORT & UTILITY
              </div>
              
              {utility['Fairy Heal'] > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#e2e8f0', marginBottom: '6px', fontFamily: 'monospace' }}>
                  <span style={{ display: 'flex', alignItems: 'center' }}><InlineIcon size={14} style={{ color: '#4ade80' }}><IconFairyWings /></InlineIcon>Fairy Healing</span>
                  <span style={{ color: '#4ade80', fontWeight: 'bold' }}>+{formatDamage(utility['Fairy Heal'])} HP</span>
                </div>
              )}
              
              {utility['Light Shield'] > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#e2e8f0', marginBottom: '6px', fontFamily: 'monospace' }}>
                  <span style={{ display: 'flex', alignItems: 'center' }}><InlineIcon size={14} style={{ color: '#facc15' }}><IconHolyShield /></InlineIcon>Holy Shield Absorbed</span>
                  <span style={{ color: '#facc15', fontWeight: 'bold' }}>{formatDamage(utility['Light Shield'])} DMG</span>
                </div>
              )}
              
              {utility['Voidling Loot'] > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#e2e8f0', marginBottom: '6px', fontFamily: 'monospace' }}>
                  <span style={{ display: 'flex', alignItems: 'center' }}><InlineIcon size={14} style={{ color: '#c084fc' }}><IconVoidSwirl /></InlineIcon>Voidling Vacuumed</span>
                  <span style={{ color: '#c084fc', fontWeight: 'bold' }}>{utility['Voidling Loot']} Items</span>
                </div>
              )}
            </div>
        )}

      </div>
    );
  };
  return (
    <div id="overlays">
<style>{`
        .lu-wrapper { text-align: center; max-width: 960px; width: 100%; padding: 20px; position: relative; }

        /* 🜂 Ambient Arcane Circle — one element, transform-only animation (GPU, zero reflow cost) */
        .lu-arcane-circle {
          position: absolute; top: 50%; left: 50%; width: 640px; height: 640px;
          max-width: 96vw; max-height: 96vw;
          transform: translate(-50%, -50%);
          border: 1px solid rgba(197,160,89,0.16);
          border-radius: 50%;
          pointer-events: none; z-index: 0;
          will-change: transform;
          animation: arcaneCircleSpin 120s linear infinite;
        }
        .lu-arcane-circle::before {
          content: '';
          position: absolute; inset: 26px;
          border: 1px dashed rgba(197,160,89,0.13);
          border-radius: 50%;
        }
        .lu-arcane-circle::after {
          content: '✦';
          position: absolute; top: -10px; left: 50%; transform: translateX(-50%);
          color: rgba(233,196,122,0.45); font-size: 0.8rem;
        }
        @keyframes arcaneCircleSpin { from { transform: translate(-50%, -50%) rotate(0deg); } to { transform: translate(-50%, -50%) rotate(360deg); } }

        .lu-title-row { position: relative; z-index: 1; display: flex; align-items: center; justify-content: center; gap: 16px; }
        .lu-rune-flank { font-family: 'Georgia', serif; font-size: 0.85rem; letter-spacing: 0.3em; color: rgba(197,160,89,0.55); text-shadow: 0 0 8px rgba(197,160,89,0.3); user-select: none; }
        .lu-title { font-size: 2.35rem; font-weight: 800; background: linear-gradient(180deg, #fffbe8 0%, #fef08a 45%, #c5a059 100%); -webkit-background-clip: text; background-clip: text; color: transparent; text-shadow: 0 0 22px rgba(251,240,138,0.35); margin-bottom: 8px; letter-spacing: 0.05em; font-family: Georgia, serif; text-transform: uppercase; }
        .lu-subtitle { position: relative; z-index: 1; font-size: 0.85rem; color: #cbd5e1; letter-spacing: 0.08em; margin-bottom: 4px; opacity: 0.9; text-transform: uppercase; font-family: Georgia, serif; }
        .lu-rune-strip { position: relative; z-index: 1; font-family: 'Georgia', serif; font-size: 0.6rem; letter-spacing: 0.3em; color: rgba(197,160,89,0.4); margin: 6px 0 8px; user-select: none; white-space: nowrap; overflow: hidden; opacity: 0.8; }
        .lu-warning { position: relative; z-index: 1; font-size: 0.72rem; color: #eab308; opacity: 0.85; margin-bottom: 22px; font-family: monospace; letter-spacing: 0.05em; font-weight: bold; }
        .lu-cards-row { position: relative; z-index: 1; display: flex; justify-content: center; gap: 24px; width: 100%; flex-wrap: wrap; }

        .lu-card { background: linear-gradient(135deg, #3b117b 0%, #1e0a45 100%); border: 1px solid #7c3aed; border-radius: 6px; width: 230px; padding: 30px 16px 22px; cursor: pointer; transition: transform 0.22s ease-in-out, box-shadow 0.22s ease-in-out, border-color 0.22s ease-in-out, background 0.22s ease-in-out; box-shadow: 0 0 20px rgba(124, 58, 237, 0.25), inset 0 0 24px rgba(124,58,237,0.08); display: flex; flex-direction: column; align-items: center; position: relative; overflow: hidden; }
        .lu-card::before { content: ''; position: absolute; inset: 0; background: radial-gradient(circle at 50% 28%, rgba(255,255,255,0.05) 0%, transparent 60%); pointer-events: none; }
        .lu-card:hover { transform: translateY(-6px); border-color: #e9c47a; box-shadow: 0 0 30px rgba(233, 196, 122, 0.5), inset 0 0 28px rgba(233,196,122,0.12); background: linear-gradient(135deg, #4c1d95 0%, #2e1065 100%); }

        /* 🜁 Rune corner brackets — pure border, negligible paint cost */
        .lu-corner { position: absolute; width: 13px; height: 13px; border: 1.5px solid rgba(197,160,89,0.65); opacity: 0.85; transition: border-color 0.22s ease-in-out; pointer-events: none; }
        .lu-corner.tl { top: 6px; left: 6px; border-right: none; border-bottom: none; }
        .lu-corner.tr { top: 6px; right: 6px; border-left: none; border-bottom: none; }
        .lu-corner.bl { bottom: 6px; left: 6px; border-right: none; border-top: none; }
        .lu-corner.br { bottom: 6px; right: 6px; border-left: none; border-top: none; }
        .lu-card:hover .lu-corner { border-color: #ffe6a3; }

        .lu-card-runes { font-family: 'Georgia', serif; font-size: 0.5rem; letter-spacing: 0.18em; color: rgba(197,160,89,0.45); margin-bottom: 10px; user-select: none; }

        /* 🜄 MMORPG-style item-slot icon frame */
        .lu-icon-frame {
          position: relative; width: 62px; height: 62px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          background: radial-gradient(circle at 50% 35%, #33176b 0%, #150a2e 70%, #0a0414 100%);
          border: 2px solid #c5a059; margin-bottom: 12px;
          box-shadow: 0 0 14px rgba(197,160,89,0.35), inset 0 0 12px rgba(124,58,237,0.4), inset 0 2px 4px rgba(255,255,255,0.07);
          transition: border-color 0.22s ease-in-out, box-shadow 0.22s ease-in-out, transform 0.22s ease-in-out;
        }
        .lu-icon-frame::before {
          content: ''; position: absolute; inset: 5px; border: 1px dashed rgba(197,160,89,0.4); border-radius: 50%; pointer-events: none;
        }
        .lu-icon-frame::after {
          content: '◆'; position: absolute; top: -7px; left: 50%; transform: translateX(-50%);
          font-size: 0.5rem; color: #d946ef; text-shadow: 0 0 6px rgba(217,70,239,0.9); pointer-events: none;
        }
        .lu-card:hover .lu-icon-frame { border-color: #ffe6a3; box-shadow: 0 0 22px rgba(255,230,163,0.55), inset 0 0 16px rgba(168,85,247,0.5); transform: scale(1.06); }
        .lu-icon { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; color: #ffe6a3; filter: drop-shadow(0 0 6px rgba(255,230,163,0.4)); transition: color 0.22s ease-in-out, filter 0.22s ease-in-out; }
        .lu-icon svg { width: 100%; height: 100%; overflow: visible; }
        .lu-card:hover .lu-icon { color: #fff6dc; filter: drop-shadow(0 0 10px rgba(255,230,163,0.7)); }

        /* 🜅 Ornate beveled reroll button — RPG item-shop styling */
        .lu-reroll-btn {
          position: relative !important; width: auto !important; max-width: 260px !important;
          background: linear-gradient(180deg, #2a1454 0%, #1a0d3a 55%, #0d0519 100%) !important;
          border: 1.5px solid #c5a059 !important;
          clip-path: polygon(14px 0, calc(100% - 14px) 0, 100% 14px, 100% calc(100% - 14px), calc(100% - 14px) 100%, 14px 100%, 0 calc(100% - 14px), 0 14px);
          box-shadow: 0 0 18px rgba(197,160,89,0.22), inset 0 0 20px rgba(124,58,237,0.28), inset 0 1px 0 rgba(255,255,255,0.06) !important;
          color: #ffe6a3 !important; padding: 12px 22px !important; margin: 0 auto !important; gap: 10px !important;
        }
        .lu-reroll-btn::before { display: none; } /* alisin ang default shine sweep, gusto natin ibang glow */
        .lu-reroll-btn:hover {
          border-color: #ffe6a3 !important; transform: translateY(-2px) !important;
          box-shadow: 0 0 30px rgba(255,230,163,0.5), inset 0 0 26px rgba(168,85,247,0.4) !important;
          background: linear-gradient(180deg, #3a1a6e 0%, #22104a 55%, #0d0519 100%) !important;
        }
        .lu-reroll-btn:disabled { transform: none !important; }
        .lu-reroll-icon { font-size: 1rem; display: inline-block; filter: drop-shadow(0 0 6px rgba(217,70,239,0.6)); transition: transform 0.4s ease; }
        .lu-reroll-btn:hover .lu-reroll-icon { transform: rotate(20deg); }
        .lu-reroll-gem { color: #d946ef; text-shadow: 0 0 8px rgba(217,70,239,0.85); font-size: 0.6rem; }
        .lu-card-title { font-size: 1.15rem; font-weight: 700; color: #ffffff; margin-bottom: 8px; letter-spacing: 0.03em; text-transform: uppercase; font-family: Georgia, serif; }
        .lu-card-desc { font-size: 0.78rem; color: #94a3b8; font-family: monospace; margin-bottom: 18px; min-height: 2em; line-height: 1.3; }

        /* 🜃 Hotkey re-styled as a wax-sigil stamp */
        .lu-hotkey { font-size: 0.85rem; color: #1e0a45; font-weight: bold; font-family: Georgia, serif; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: radial-gradient(circle, #ffe6a3 0%, #c5a059 100%); box-shadow: 0 0 10px rgba(255,230,163,0.5); margin-top: auto; flex-shrink: 0; }

        @media (max-width: 840px), (max-height: 500px) and (orientation: landscape) {
          /* Compress Title and Headers */
          .lu-wrapper {
            padding: 10px !important;
          }
          .lu-arcane-circle {
            opacity: 0.5 !important;
          }
          .lu-rune-flank {
            display: none !important; /* Itago sa maliit na screen para hindi crowded */
          }
          .lu-title {
            font-size: 1.2rem !important; /* Mula 2.35rem pababa sa halos kalahati */
            margin-bottom: 2px !important;
          }
          .lu-subtitle {
            font-size: 0.55rem !important;
            margin-bottom: 2px !important;
          }
          .lu-rune-strip {
            font-size: 0.4rem !important;
            margin: 3px 0 !important;
            letter-spacing: 0.15em !important;
          }
          .lu-warning {
            font-size: 0.5rem !important;
            margin-bottom: 8px !important; /* Dikit na dikit na pababa */
          }
          
          /* Compress Cards Layout */
          .lu-cards-row {
            gap: 6px !important; /* Tinanggal ang malaking gaps */
          }
          
          /* Shrink Upgrade Cards */
          .lu-card {
            width: 31% !important; /* Hatian ang screen sa tatlo */
            min-width: 100px !important; /* Para hindi pumutok sa sobrang liit na screen */
            padding: 8px !important; /* Manipis na padding */
            border-radius: 6px !important; 
          }
          .lu-corner {
            width: 8px !important;
            height: 8px !important;
          }
          .lu-card-runes {
            display: none !important; /* Iwas clutter sa maliit na card */
          }
          .lu-icon-frame {
            width: 34px !important; height: 34px !important; margin-bottom: 4px !important;
          }
          .lu-icon-frame::after {
            font-size: 0.35rem !important; top: -4px !important;
          }
          .lu-reroll-btn {
            padding: 8px 14px !important; max-width: 220px !important;
          }
          
          /* Shrink Content Inside Cards */
          .lu-icon {
            width: 18px !important; height: 18px !important; /* Mula 32px */
            margin-bottom: 4px !important;
          }
          .lu-card-title {
            font-size: 0.6rem !important; /* Mula 1.15rem */
            margin-bottom: 4px !important;
            text-align: center;
          }
          .lu-card-desc {
            font-size: 0.45rem !important; /* Mula 0.78rem */
            margin-bottom: 4px !important;
            text-align: center;
            line-height: 1.1 !important;
          }
          .lu-hotkey {
            display: none !important; /* Itago ang hotkeys sa mobile dahil touch screen ito */
          }
        }

        .council-news-overlay { position: fixed; inset: 0; background: rgba(3, 1, 17, 0.85); display: flex; align-items: center; justify-content: center; z-index: 100000; backdrop-filter: blur(6px); pointer-events: auto; }
        
        /* ==========================================================================
           ADVANCED WITCHCRAFT & DARK SPELLBOOK GRIMOIRE GLOBAL DESIGN
           ========================================================================== */
        .wizard-panel {
          background: radial-gradient(circle at 50% 30%, #1e0b3d 0%, #080312 85%, #030107 100%) !important;
          border: 2px solid #c5a059 !important; /* Brass/Gold Ancient Trim */
          box-shadow: 
            0 0 50px rgba(109, 40, 217, 0.35), 
            inset 0 0 30px rgba(0, 0, 0, 0.9),
            inset 0 0 20px rgba(197, 160, 89, 0.15) !important;
          position: relative;
          overflow: hidden;
          border-radius: 12px !important;
          padding: 42px 32px !important;
          animation: occultAmbient 8s infinite ease-in-out;
          
          /* 🔥 Pwersahing maging Flexbox para gumana ang dynamic panel stretching */
          display: flex !important;
          flex-direction: column !important;
        }
        @keyframes occultAmbient {
          0% { box-shadow: 0 0 40px rgba(109, 40, 217, 0.25), inset 0 0 30px rgba(0,0,0,0.9); border-color: #c5a059; }
          50% { box-shadow: 0 0 60px rgba(167, 139, 250, 0.45), inset 0 0 40px rgba(124, 58, 237, 0.15); border-color: #e9c47a; }
          100% { box-shadow: 0 0 40px rgba(109, 40, 217, 0.25), inset 0 0 30px rgba(0,0,0,0.9); border-color: #c5a059; }
        }
        
        /* Ancient Filigree Corner Brackets */
        .panel-corner {
          position: absolute; width: 16px; height: 16px;
          border: 2px solid #c5a059; pointer-events: none; opacity: 0.75; z-index: 10;
        }
        .pc-tl { top: 12px; left: 12px; border-right: none; border-bottom: none; }
        .pc-tr { top: 12px; right: 12px; border-left: none; border-bottom: none; }
        .pc-bl { bottom: 12px; left: 12px; border-right: none; border-top: none; }
        .pc-br { bottom: 12px; right: 12px; border-left: none; border-top: none; }

        /* Inner dashed ring lines */
        .wizard-panel::before, .council-news-box::before {
          content: ''; position: absolute;
          top: 8px; left: 8px; right: 8px; bottom: 8px;
          border: 1px dashed rgba(197, 160, 89, 0.25); border-radius: 8px; pointer-events: none;
        }

        /* Celestial Moon Divider Line */
        .mystic-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent 0%, #c5a059 35%, #ffe6a3 50%, #c5a059 65%, transparent 100%) !important;
          margin: 24px 0 !important; position: relative; opacity: 0.75; width: 100%;
        }
        .mystic-divider::after {
          content: '☾  ✦  ☽' !important; position: absolute; top: 50%; left: 50%;
          transform: translate(-50%, -50%); color: #ffe6a3; background: #090414;
          padding: 0 14px; font-size: 0.85rem; font-family: 'Georgia', serif;
          letter-spacing: 3px; text-shadow: 0 0 10px rgba(254, 240, 138, 0.8);
        }

        /* Form Labels */
        .wizard-field-label {
          font-family: 'Georgia', serif; color: #d8b4fe !important; font-size: 0.75rem;
          letter-spacing: 0.14em; text-transform: uppercase; margin-bottom: 8px;
          display: block; text-shadow: 0 0 8px rgba(167, 139, 250, 0.3); font-weight: 600; text-align: left;
        }
        .wizard-field-label::before { content: '🜁 '; color: #c5a059; font-size: 0.8rem; }

        /* Dark Magic Inputs */
        .wizard-field-input {
          background: rgba(5, 2, 12, 0.95) !important; border: 1px solid rgba(197, 160, 89, 0.4) !important;
          color: #f8fafc !important; font-family: 'Georgia', serif !important; font-size: 1rem !important;
          padding: 12px 16px !important; border-radius: 4px !important;
          box-shadow: inset 0 3px 8px rgba(0,0,0,0.9), 0 0 8px rgba(124, 58, 237, 0.05) !important;
          transition: all 0.3s cubic-bezier(0.25, 1, 0.5, 1) !important; letter-spacing: 0.03em; width: 100%; box-sizing: border-box;
        }
        .wizard-field-input:focus {
          border-color: #ffe6a3 !important; box-shadow: 0 0 20px rgba(225, 180, 89, 0.35), inset 0 2px 6px rgba(0,0,0,0.9) !important;
          outline: none; background: #110724 !important;
        }

        /* Premium Buttons */
        .wizard-btn {
          position: relative; background: linear-gradient(180deg, #1b0c30 0%, #0d0519 100%) !important;
          border: 1px solid rgba(147, 51, 234, 0.6) !important; color: #e2e8f0 !important;
          font-family: 'Georgia', serif !important; font-size: 0.88rem !important; font-weight: bold !important;
          letter-spacing: 0.12em; text-transform: uppercase; padding: 13px 22px !important; border-radius: 4px !important;
          transition: all 0.3s cubic-bezier(0.25, 1, 0.5, 1) !important;
          box-shadow: 0 6px 16px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.04) !important;
          display: flex; align-items: center; justify-content: center; gap: 14px; cursor: pointer; overflow: hidden; width: 100%; box-sizing: border-box; margin-bottom: 10px;
        }
        .wizard-btn::before {
          content: ''; position: absolute; top: 0; left: -100%; width: 50%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.12), transparent); transform: skewX(-25deg); pointer-events: none;
        }
        .wizard-btn:hover::before { left: 150%; transition: all 0.6s ease-in-out; }
        .wizard-btn:hover {
          background: linear-gradient(180deg, #2a104d 0%, #130626 100%) !important; border-color: #a78bfa !important;
          box-shadow: 0 0 22px rgba(139, 92, 246, 0.45), 0 6px 16px rgba(0,0,0,0.65) !important; transform: translateY(-2px); color: #ffffff !important;
        }

        /* Gold Theme Option */
        .wizard-btn.gold-theme {
          background: linear-gradient(180deg, #2e1403 0%, #140801 100%) !important; border: 1px solid rgba(197, 160, 89, 0.6) !important; color: #fef08a !important; text-shadow: 0 1px 3px rgba(0,0,0,0.8);
        }
        .wizard-btn.gold-theme:hover {
          background: linear-gradient(180deg, #4d2104 0%, #1f0b01 100%) !important; border-color: #ffe6a3 !important; box-shadow: 0 0 25px rgba(225, 180, 89, 0.4), 0 6px 16px rgba(0,0,0,0.65) !important;
        }

        /* Crimson Blood/Danger Option */
        .wizard-btn.danger-theme {
          background: linear-gradient(180deg, #320a11 0%, #170206 100%) !important; border: 1px solid rgba(220, 38, 38, 0.5) !important; color: #fca5a5 !important;
        }
        .wizard-btn.danger-theme:hover {
          background: linear-gradient(180deg, #5c121e 0%, #2b040a 100%) !important; border-color: #ef4444 !important; box-shadow: 0 0 22px rgba(239, 68, 68, 0.4), 0 6px 16px rgba(0,0,0,0.65) !important;
        }

        .wizard-btn.council-btn {
          background: linear-gradient(180deg, #0e0721 0%, #04020a 100%) !important; border-color: rgba(91, 33, 182, 0.5) !important; color: #a78bfa !important;
        }
        .wizard-btn.council-btn:hover {
          background: linear-gradient(180deg, #1d0f3d 0%, #0a0417 100%) !important; border-color: #c4b5fd !important; box-shadow: 0 0 20px rgba(124, 58, 237, 0.3) !important;
        }

        /* ==========================================================================
           WIZARDRY SPECIFIC ARCANE TEXT LINK STYLE
           ========================================================================== */
        .mystic-tribute-container {
          margin-top: 24px;
          text-align: center;
          width: 100%;
        }
        .mystic-tribute-link {
          color: #c5a059; /* Matching Ancient Gold */
          font-family: 'Georgia', serif;
          font-size: 0.74rem;
          font-weight: bold;
          letter-spacing: 0.14em;
          text-decoration: none;
          opacity: 0.7;
          transition: all 0.28s ease-in-out;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          text-shadow: 0 0 5px rgba(197, 160, 89, 0.2);
        }
        .mystic-tribute-link:hover {
          color: #ffe6a3; /* Ethereal White-Gold */
          opacity: 1;
          text-shadow: 0 0 12px rgba(255, 230, 163, 0.85);
          letter-spacing: 0.17em;
          transform: translateY(-1px);
        }

        /* ==========================================================================
           RE-FIXED & RE-STYLED COUNCIL SANCTUM ARCHIVES SCROLL (image_439347.png FIX)
           ========================================================================== */
        .council-news-box {
          background: radial-gradient(circle at 50% 15%, #180833 0%, #05020c 100%) !important; 
          border: 2px solid #c5a059 !important;
          box-shadow: 0 0 50px rgba(124, 58, 237, 0.4), inset 0 0 30px rgba(0,0,0,0.9) !important;
          border-radius: 12px !important;
          
          /* 📐 PINALAKING BASE SIZE (Dating 580x495) */
          width: 760px; 
          height: 680px; 
          display: flex; 
          flex-direction: column; 
          padding: 30px; /* Mas maluwag na padding */
          position: relative; 
          box-sizing: border-box;

          /* 🛠️ TEXTAREA RESIZE AT LIMITS */
          resize: both;          
          overflow: hidden;      
          min-width: 500px;      
          min-height: 450px;     
          max-width: 95vw;       
          max-height: 95vh;
        }

        .council-tab-headers {
          display: flex; gap: 12px; margin-bottom: 16px; position: relative; z-index: 20; width: 100%;
        }

        /* Custom Sorcery Tab Look instead of basic white buttons */
        .council-tab-btn {
          flex: 1; background: linear-gradient(180deg, #120624 0%, #090312 100%) !important;
          border: 1px solid rgba(197, 160, 89, 0.3) !important; color: #a78bfa !important;
          font-family: 'Georgia', serif; 
          font-size: 0.9rem; /* Pinalaki mula 0.8rem */
          padding: 14px !important; /* Pinalaki ang clickable area ng tab */
          border-radius: 4px; cursor: pointer; font-weight: bold; text-transform: uppercase;
          transition: all 0.2s ease; box-sizing: border-box;
        }

        .council-tab-btn:hover:not(.active) {
          border-color: rgba(197, 160, 89, 0.7) !important; color: #ffffff !important; background: #1a0a33 !important;
        }

        .council-tab-btn.active {
          background: linear-gradient(180deg, #2e1403 0%, #140801 100%) !important;
          color: #fef08a !important; border-color: #c5a059 !important;
          box-shadow: 0 0 12px rgba(197, 160, 89, 0.3); text-shadow: 0 1px 2px rgba(0,0,0,0.8);
        }

        /* Darker Void Box Container for Logs */
        .council-scroll-logs {
          flex: 1; overflow-y: auto; background: rgba(4, 2, 10, 0.85) !important;
          border: 1px solid rgba(197, 160, 89, 0.2) !important; border-radius: 6px;
          padding: 20px !important; text-align: left; box-sizing: border-box;
        }

        .council-log-item {
          margin-bottom: 18px; padding-bottom: 14px; border-bottom: 1px solid rgba(197, 160, 89, 0.15);
        }

        .council-log-header {
          font-size: 0.75rem; /* Pinalaki mula 0.68rem */
          color: #c5a059; font-family: monospace; font-weight: bold; margin-bottom: 6px; letter-spacing: 1px;
        }

        .council-log-title {
          color: #fef08a; 
          font-size: 1.1rem; /* Pinalaki mula 0.95rem para sa mas magandang hierarchy */
          font-family: 'Georgia', serif; font-weight: bold; margin-bottom: 8px; text-shadow: 0 0 8px rgba(254,240,138,0.2);
        }

        .council-log-desc {
          color: #cbd5e1; 
          font-size: 0.85rem; /* Pinalaki mula 0.78rem para mas madaling basahin */
          line-height: 1.5; font-family: monospace; white-space: pre-line;
        }

          .witch-table { 
          width: 100%; 
          border-collapse: separate !important; /* 🔥 Iniba ito para mas solid ang sticky header */
          border-spacing: 0;
          font-family: 'Georgia', serif; 
          color: #cbd5e1; 
          margin-top: 0px; 
        }

        .witch-table th { 
          position: sticky; 
          top: 0; 
          z-index: 10; 
          background: #110624 !important; 
          color: #ffe6a3; 
          padding: 12px; 
          font-size: 0.8rem; 
          letter-spacing: 0.1em; 
          text-transform: uppercase; 
          /* 🔥 Gumamit ng box-shadow imbes na border-bottom para walang gap na pumapasok */
          box-shadow: 0 2px 0 rgba(197, 160, 89, 0.3), 0 4px 6px rgba(0,0,0,0.5); 
        }
        .witch-table td { padding: 12px; border-bottom: 1px solid rgba(124, 58, 237, 0.15); font-size: 0.88rem; }
        .witch-table tr:hover td { background: rgba(124, 58, 237, 0.1); color: #ffffff; }

        @keyframes goldPulse {
          0% {
            text-shadow: 
              0 0 12px rgba(254, 240, 138, 0.5), 
              0 0 25px rgba(254, 240, 138, 0.3);
          }
          50% {
            text-shadow: 
              0 0 25px rgba(254, 240, 138, 1), 
              0 0 45px rgba(254, 240, 138, 0.8), 
              0 0 60px rgba(217, 119, 6, 0.6);
          }
          100% {
            text-shadow: 
              0 0 12px rgba(254, 240, 138, 0.5), 
              0 0 25px rgba(254, 240, 138, 0.3);
          }
        }

        /* Gold Glow for the #1 Rank (Dito natin isasaksak ang !important sa animation track) */
        .gold-leader td {
          color: #fef08a !important;
          font-weight: 900 !important;
          font-size: 1.35rem !important;
          padding: 18px 12px !important;
          vertical-align: middle !important;
          
          /* 🔥 Pwersahing tumakbo ang malinis na animation sequence */
          animation: goldPulse 2.5s infinite ease-in-out !important;
        }

        /* Silver Glow for the #2 Rank */
        .silver-leader td {
          color: #ffffff !important; 
          text-shadow: 
            0 0 5px #94a3b8, 
            0 0 15px rgba(203, 213, 225, 0.8), 
            0 0 25px rgba(148, 163, 184, 0.5) !important;
          font-weight: 800 !important;
          font-size: 1.15rem !important;
          padding: 15px 12px !important;
          vertical-align: middle !important; /* 🔥 Hahatak sa medalya papunta sa gitna */
        }

        /* Bronze Glow for the #3 Rank */
        .bronze-leader td {
          color: #fef3c7 !important; 
          text-shadow: 
            0 0 5px #b45309, 
            0 0 15px rgba(217, 119, 6, 0.8), 
            0 0 25px rgba(180, 83, 9, 0.5) !important;
          font-weight: 800 !important;
          font-size: 1.02rem !important;
          padding: 13px 12px !important;
          vertical-align: middle !important; /* 🔥 Hahatak sa medalya papunta sa gitna */
        }

        /* Description below the Leaderboard Title */
        .lb-description {
          font-family: 'Georgia', serif;
          font-size: 0.75rem;
          color: #94a3b8;
          text-align: center;
          margin: -10px 0 15px 0;
          font-style: italic;
          line-height: 1.4;
          padding: 0 20px;
        }

        /* Custom Rule para sa Leaderboard Box para kainin ang lahat ng bakanteng vertical space */
        .lb-scroll-area {
          flex: 1 !important;
          background: rgba(5, 2, 12, 0.6) !important;
          border: 1px solid rgba(197, 160, 89, 0.2) !important;
          border-radius: 6px;
          overflow-y: auto;
          padding: 0 !important; /* 🔥 NA-FIX ANG BUTAS: Inalis ang padding para sagad ang header sa taas */
          margin-bottom: 20px !important;
        }

        /* Tanggalin ang margin-top auto dahil si flex: 1 na sa itaas ang bahalang magtulak pababa */
        .lb-bottom-btn {
          flex-shrink: 0;
        }

          /* ==========================================================================
           MOBILE LANDSCAPE EXTREME COMPRESSION FIX (V3 - SAFARI BARS COMPLIANT)
           ========================================================================== */
        @media (max-width: 932px) and (orientation: landscape) {
          /* 🔥 iOS Safari Global Overlay Fix */
          .overlay {
            position: fixed !important;
            height: 100vh !important;
            height: -webkit-fill-available !important; 
          }

          /* 🔥 NA-FIX PARA SA SAFARI BARS (IMG_1163 & IMG_1164 FIX):
             Binabaan ang max-height sa 80svh/80vh para piliting pumasok sa loob ng screen 
             ang Title at ang mga bottom buttons nang hindi sila napuputol. */
          .wizard-panel, .council-news-box {
            width: 96vw !important;
            min-width: 0 !important;      
            min-height: 0 !important;     
            height: auto !important;      
            max-height: 80svh !important;  /* Bawas ang sukat ng Safari Address Bar */
            max-height: 80vh !important;   /* Fallback para sa mga lumang browser */
            padding: 6px 12px !important;  /* Mas pinalit pa ang padding para sa hininga ng UI */
            margin-top: 0px !important; 
            overflow-y: auto !important;    
          }
          
          /* Paliitin ang text sa Main Menu para hindi maputol sa taas at baba */
          .menu-title { font-size: 1.1rem !important; line-height: 1 !important; margin-bottom: 0 !important; }
          .menu-sub { font-size: 0.45rem !important; letter-spacing: 0.18em !important; margin-bottom: 4px !important; }

          /* Paliitin ang mga Titles at Texts */
          .section-title { font-size: 0.9rem !important; margin-bottom: 4px !important; }
          .lb-description { font-size: 0.55rem !important; margin: 0 0 6px 0 !important; line-height: 1.2 !important; }
          .council-tab-btn { padding: 6px !important; font-size: 0.65rem !important; }
          
          /* PALIITIN ANG TABLE SA LEADERBOARD */
          .lb-scroll-area { margin-bottom: 6px !important; padding: 0 !important; }
          .witch-table th { padding: 6px !important; font-size: 0.55rem !important; }
          .witch-table td { padding: 6px !important; font-size: 0.65rem !important; }
          
          /* Paliitin ang Medals/Top 3 sa Leaderboard para magkasya */
          .gold-leader td { font-size: 0.85rem !important; padding: 6px !important; }
          .silver-leader td { font-size: 0.8rem !important; padding: 6px !important; }
          .bronze-leader td { font-size: 0.75rem !important; padding: 6px !important; }
          
          /* Paliitin ang iba pang elements tulad ng buttons, inputs, at dividers */
          .mystic-divider { margin: 6px 0 !important; }
          .mystic-divider::after { font-size: 0.65rem !important; padding: 0 8px !important; }
          .wizard-field-label { font-size: 0.6rem !important; margin-bottom: 4px !important; }
          .wizard-field-input { padding: 4px 10px !important; font-size: 0.75rem !important; margin-bottom: 6px !important; }
          .wizard-btn { padding: 6px 12px !important; font-size: 0.65rem !important; margin-bottom: 4px !important; }
          .mystic-tribute-container { margin-top: 4px !important; }
          .mystic-tribute-link { font-size: 0.55rem !important; }
        }

        /* ==========================================================================
           MOBILE PAUSE SCREEN FIX (ITINAAS AT PINALIIT)
           ========================================================================== */
        @media (max-width: 840px), (max-height: 540px) and (orientation: landscape) {
          /* 🔥 Ito ang hihila sa Menu pataas imbis na sa gitna */
          #pause-overlay {
            align-items: flex-start !important; 
            padding-top: 12vh !important;       
          }
          
          /* 🔥 Ito ang magpapaliit sa mismong kahon */
          .pause-panel {
            width: 200px !important;            
            padding: 12px 16px !important;      
            margin-top: 10px !important;
          }
          
          /* 🔥 Papaliitin ang text na "Paused" */
          .pause-title {
            font-size: 0.9rem !important;       
            margin-bottom: 4px !important;
          }
          
          /* 🔥 Papaliitin ang space ng divider line */
          .pause-panel .mystic-divider {
            margin: 8px 0 !important;
          }
          
          /* 🔥 Papaliitin ang mga buttons sa loob ng Pause Menu */
          .pause-panel .wizard-btn {
            font-size: 0.65rem !important;      
            padding: 6px 12px !important;       
            margin-bottom: 6px !important;
          }
        }

        /* ==========================================================================
             IN-GAME HUD & PAUSE BUTTON COMPRESSION (IMG_47cc81 FIX)
             ========================================================================== */
          /* Targetin ang pause button o anumang button sa itaas ng HUD */
          .pause-btn, .hud-pause-btn, .game-hud-top button, .game-hud-top div[role="button"] {
            padding: 4px 10px !important;    /* Bawasan ang dambuhalang padding */
            font-size: 0.75rem !important;   /* Paliitin ang font/emoji size */
            line-height: 1 !important;
            min-width: auto !important;       /* Tanggalin ang desktop width limits */
            height: auto !important;          /* Hayaan siyang sumunod sa maliit na padding */
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
          }

          /* Siguraduhin ding hindi dambuhala ang buong top HUD bar sa mobile layout */
          .game-hud-top {
            padding: 4px 12px !important;
            font-size: 0.8rem !important;
          }

          /* ==========================================================================
           🧙‍♂️ ANIMATED LEADERBOARD AVATAR PREVIEW
           ========================================================================== */
        @keyframes avatarFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }
        @keyframes auraPulse {
          0%, 100% { transform: scale(1); opacity: 0.5; filter: blur(4px); }
          50% { transform: scale(1.2); opacity: 0.8; filter: blur(6px); }
        }
        @keyframes robeSway {
          0%, 100% { transform: rotate(-3deg); border-radius: 40% 40% 60% 60%; }
          50% { transform: rotate(3deg); border-radius: 45% 45% 55% 55%; }
        }
        @keyframes shadowFlame {
          0%, 100% { box-shadow: 0 -3px 8px rgba(220, 38, 38, 0.8); }
          50% { box-shadow: 0 -6px 12px rgba(239, 68, 68, 0.4); }
        }

        .avatar-container {
          position: relative; width: 44px; height: 44px; display: flex; 
          align-items: center; justify-content: center; margin: 0 auto;
        }
        .avatar-aura {
          position: absolute; width: 36px; height: 36px; border-radius: 50%;
          animation: auraPulse 3s infinite ease-in-out; z-index: 1;
        }
        .avatar-body-float {
          position: relative; z-index: 2; display: flex; flex-direction: column; 
          align-items: center; animation: avatarFloat 3.5s infinite ease-in-out;
        }
        .avatar-crown {
          width: 14px; height: 14px; border-radius: 50%; position: relative; z-index: 4; 
          margin-bottom: -5px; box-shadow: inset 0 2px 4px rgba(255,255,255,0.3), 0 2px 4px rgba(0,0,0,0.5);
        }
        .avatar-brim {
          width: 30px; height: 10px; border-radius: 50%; position: relative; z-index: 3;
          box-shadow: 0 3px 5px rgba(0,0,0,0.6); border: 2px solid;
        }
        .avatar-robe {
          width: 22px; height: 16px; position: relative; z-index: 2; margin-top: -3px;
          animation: robeSway 4s infinite ease-in-out; border-bottom: 2px solid;
          box-shadow: inset 0 -3px 6px rgba(0,0,0,0.6);
        }

        /* 🔥 GLOWING ANIMATION PARA SA KO-FI LINK */
        @keyframes arcaneGlow {
          0%, 100% {
            text-shadow: 0 0 8px rgba(197, 160, 89, 0.6), 0 0 15px rgba(197, 160, 89, 0.3);
            transform: scale(1);
          }
          50% {
            text-shadow: 0 0 15px rgba(255, 230, 163, 1), 0 0 30px rgba(255, 230, 163, 0.8), 0 0 45px rgba(217, 119, 6, 0.6);
            transform: scale(1.02); /* Konting umbok para mas mapansin */
          }
        }

        .tribute-glow-effect {
          animation: arcaneGlow 2.5s infinite ease-in-out !important;
        }

        /* 🔥 PURE CSS MOBILE RESPONSIVE OVERRIDES (GRIMOIRE) 🔥 */
            
        /* 1. PORTRAIT FIX: Native overlay scroll, expand full height, tabs at top */
        @media (max-width: 768px) and (orientation: portrait) {
          .grimoire-modal-overlay {
            align-items: flex-start !important;
            padding-top: 65px !important; /* Space para hindi makain ang tabs sa taas */
            padding-bottom: 40px !important;
            overflow-y: auto !important;
            overflow-x: hidden !important;
          }
          .grimoire-book { 
            flex-direction: column !important; 
            height: auto !important;
            max-height: none !important; /* Tanggalin ang height restriction para mag-expand */
            margin-top: 0 !important;
            overflow: visible !important; /* 👈 MUST BE VISIBLE FOR TABS TO SHOW! */
          }
          .grimoire-page {
            flex: none !important;
            min-height: auto !important;
            height: auto !important;
          }
          .grimoire-left { 
            border-radius: 8px 8px 0 0 !important; 
            border-right: 1.5px solid #c5a059 !important; 
            border-bottom: 1px dashed rgba(197,160,89,0.4) !important; 
          }
          .grimoire-right { 
            border-radius: 0 0 8px 8px !important; 
            border-left: 1.5px solid #c5a059 !important; 
            border-top: none !important; 
          }
          .grimoire-spine { 
            display: none !important; 
          }
          .grimoire-tabs-container {
            flex-direction: row !important;
            top: -42px !important;
            left: 0 !important;
            width: 100% !important;
            justify-content: center !important;
          }
          .mobile-tab-btn {
            writing-mode: horizontal-tb !important;
            transform: none !important;
            padding: 10px 16px !important;
            border-radius: 8px 8px 0 0 !important;
            border-right: 1.5px solid #c5a059 !important;
            border-bottom: none !important;
            height: auto !important;
          }
          .grimoire-page-inner {
            height: auto !important;
            overflow: visible !important; /* Hayaan lang na i-stretch ng content ang container */
          }
        }

        /* 2. LANDSCAPE FIX: Prevent cutoff, restrict height, icon tabs */
        @media (max-width: 932px) and (orientation: landscape) {
          .grimoire-book {
            margin-left: 45px !important; 
            width: calc(100vw - 70px) !important; 
            min-height: 0 !important;     
            height: 85svh !important;     
            max-height: 85svh !important; 
            overflow: visible !important; /* 👈 Ensure tabs don't clip left */
          }
          .grimoire-tabs-container {
            left: -38px !important; 
          }
          .mobile-tab-btn {
            font-size: 0 !important;      
            padding: 12px 6px !important; 
            writing-mode: horizontal-tb !important; 
            transform: none !important; 
            min-width: 38px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
          }
          .mobile-tab-btn:nth-child(1)::after {
            content: '📜'; 
            font-size: 1.2rem !important;
          }
          .mobile-tab-btn:nth-child(2)::after {
            content: '🦇'; 
            font-size: 1.2rem !important;
          }
        }

        /* 3. UNIVERSAL PAGE CLIPPING FIX */
        @media (max-width: 932px) {
          .grimoire-page-inner {
            overflow-y: auto !important;  
            padding: 16px !important; 
          }
        }
      `}</style>


      {/* MAIN MENU SCREEN */}
      {screen === 'menu' && (
        <div className="overlay active">
          <div className="panel wizard-panel">
            <div className="panel-corner pc-tl" />
            <div className="panel-corner pc-tr" />
            <div className="panel-corner pc-bl" />
            <div className="panel-corner pc-br" />
            
            <div className="panel-shine" />
            <div className="menu-title"><span className="arc">ARCANE</span><br/><span className="sur">SURVIVAL</span></div>
            <div className="menu-sub">The Last Covenant</div>
            <div className="divider mystic-divider" />
            
            <div className="field-group" style={{ width: '100%', marginBottom: '16px' }}>
              <label className="field-label wizard-field-label">ARCANE IDENTITY</label>
              <input 
                className="field-input wizard-field-input"
                type="text"
                value={wizardName}
                onChange={e => setWizardName(e.target.value)}
                placeholder="e.g. Archmage Martel"
                maxLength={16}
                style={{ textAlign: 'center' }}
              />
            </div>

            <button className="btn wizard-btn" onClick={() => executeWithTransition(() => onAction('start-solo', { name: wizardName }))}>
              
              <span className="btn-icon" style={{ display: 'inline-flex', verticalAlign: 'middle', marginRight: '4px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M12 3 L17 16 L7 16 Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" fill="rgba(233,196,122,0.15)"/>
                  <ellipse cx="12" cy="17" rx="7" ry="1.6" stroke="currentColor" strokeWidth="1.6" fill="none"/>
                  <path d="M12 3 Q13 5 11.5 6.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" fill="none"/>
                  <circle cx="14.5" cy="9" r="0.8" fill="currentColor"/>
                </svg>
              </span><span className="btn-label">Solo Trial</span>
            </button>
{/* 🔥 FIX 2: 3-Way Conditional Handling para iwas click-spamming habang nagre-refresh */}
            {coopActiveInDb === null ? (
              /* PHASE A: Habang naglo-load pa lang ang internet (Naka-lock at loading style) */
              <button 
                className="btn wizard-btn" 
                disabled 
                style={{ 
                  marginBottom: '10px',
                  opacity: 0.5, 
                  cursor: 'not-allowed', 
                  background: 'rgba(11, 4, 26, 0.4)',
                  borderColor: 'rgba(197, 160, 89, 0.2)',
                  boxShadow: 'none'
                }}
              >
                <span className="btn-icon" style={{ display: 'inline-flex', verticalAlign: 'middle', marginRight: '4px' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="10" r="6" stroke="currentColor" strokeWidth="1.6" fill="rgba(233,196,122,0.12)"/>
                    <path d="M9 8.5 Q12 6 15 8.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.7"/>
                    <line x1="7" y1="18" x2="17" y2="18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                    <path d="M9 18 Q12 16 15 18" stroke="currentColor" strokeWidth="1.4" fill="none"/>
                  </svg>
                </span>
                <span className="btn-label" style={{ color: '#94a3b8' }}>Chanting Gate Spell...</span>
              </button>
            ) : coopActiveInDb ? (
              /* PHASE B: Kapag CONFIRMED ng Supabase na totoong TRUE / OPEN ang coop */
             <button 
                className="btn gold wizard-btn gold-theme" 
                onClick={() => {
                  if (coopActiveInDb !== true) return;
                  executeWithTransition(() => setScreen('coop-menu'));
                }}
              >
                <span className="btn-icon" style={{ display: 'inline-flex', verticalAlign: 'middle', marginRight: '4px' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <line x1="5" y1="5" x2="17" y2="17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                    <path d="M17 17 L19.5 15.5 L18.5 19.5 L17 17 Z" fill="currentColor"/>
                    <line x1="19" y1="5" x2="7" y2="17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                    <path d="M7 17 L4.5 15.5 L5.5 19.5 L7 17 Z" fill="currentColor"/>
                  </svg>
                </span>
                <span className="btn-label">Co-op Covenant</span>
                      <span
                style={{
                  position: 'absolute',
                  right: '12px',
                  width: '33px',
                  height: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.5rem',
                  color: '#ffe9b5',
                  fontWeight: 'bold',
                  letterSpacing: '1px',
                  fontFamily: 'monospace',
                  borderRadius: '4px',
                  border: '1px solid rgba(255, 215, 120, 0.8)',
                  background:
                    'linear-gradient(180deg, #6a3a0f 0%, #2a1203 60%, #1a0b02 100%)',
                  boxSizing: 'border-box',
                  /* ✨ MAIN MAGIC GLOW */
                  boxShadow:
                    '0 0 6px rgba(255, 210, 120, 0.35), 0 0 14px rgba(197, 160, 89, 0.25), inset 0 0 6px rgba(255, 230, 160, 0.15)',
                  /* ✨ TEXT MAGIC */
                  textShadow:
                    '0 0 6px rgba(255, 220, 140, 0.9), 0 0 12px rgba(255, 180, 80, 0.4)',
                  /* ✨ subtle depth */
                  backdropFilter: 'blur(2px)',
                }}
              >
                BETA
              </span>
              </button>
            ) : (
              /* PHASE C: Kapag CONFIRMED ng Supabase na FALSE / SEALED ang coop */
              <button 
                className="btn wizard-btn" 
                disabled 
                style={{ 
                  marginBottom: '10px',
                  opacity: 0.35, 
                  cursor: 'not-allowed', 
                  background: 'rgba(5, 2, 12, 0.6)',
                  borderColor: 'rgba(255,255,255,0.05)',
                  boxShadow: 'none'
                }}
              >
                <span className="btn-icon" style={{ display: 'inline-flex', verticalAlign: 'middle', marginRight: '4px' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <rect x="6" y="11" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.6" fill="rgba(233,196,122,0.1)"/>
                    <path d="M8.5 11 V8 a3.5 3.5 0 0 1 7 0 V11" stroke="currentColor" strokeWidth="1.6" fill="none"/>
                    <circle cx="12" cy="15" r="1.3" fill="currentColor"/>
                    <line x1="12" y1="16.3" x2="12" y2="18" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                </span>
                <span className="btn-label" style={{ color: '#64748b' }}>Co-op Gates Sealed by Council</span>
              </button>
            )}
            <button className="btn wizard-btn" onClick={() => executeWithTransition(() => setScreen('leaderboard'))}>
              <span className="btn-icon" style={{ display: 'inline-flex', verticalAlign: 'middle', marginRight: '4px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M8 4 H16 V9 a4 4 0 0 1 -8 0 V4 Z" stroke="currentColor" strokeWidth="1.6" fill="rgba(233,196,122,0.12)"/>
                  <path d="M8 5.5 H5.5 a2 2 0 0 0 0 4 H8" stroke="currentColor" strokeWidth="1.3" fill="none"/>
                  <path d="M16 5.5 H18.5 a2 2 0 0 1 0 4 H16" stroke="currentColor" strokeWidth="1.3" fill="none"/>
                  <line x1="12" y1="13" x2="12" y2="19" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                  <line x1="8" y1="19" x2="16" y2="19" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
              </span><span className="btn-label">Arcane Tombstones</span>
              <span
                style={{
                  position: 'absolute',
                  right: '12px',
                  width: '33px',
                  height: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.5rem',
                  color: '#ffe9b5',
                  fontWeight: 'bold',
                  letterSpacing: '1px',
                  fontFamily: 'monospace',
                  borderRadius: '4px',
                  border: '1px solid rgba(255, 215, 120, 0.8)',
                  background:
                    'linear-gradient(180deg, #6a3a0f 0%, #2a1203 60%, #1a0b02 100%)',
                  boxSizing: 'border-box',
                  /* ✨ MAIN MAGIC GLOW */
                  boxShadow:
                    '0 0 6px rgba(255, 210, 120, 0.35), 0 0 14px rgba(197, 160, 89, 0.25), inset 0 0 6px rgba(255, 230, 160, 0.15)',
                  /* ✨ TEXT MAGIC */
                  textShadow:
                    '0 0 6px rgba(255, 220, 140, 0.9), 0 0 12px rgba(255, 180, 80, 0.4)',
                  /* ✨ subtle depth */
                  backdropFilter: 'blur(2px)',
                }}
              >
                RANKS
              </span>    

          </button>

            <button className="btn wizard-btn" style={{ borderColor: '#d946ef' }} onClick={() => executeWithTransition(() => setScreen('metashop'))}>
              <span className="btn-icon" style={{ display: 'inline-flex', verticalAlign: 'middle', marginRight: '4px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth="1.6" fill="none"/>
                  <path d="M12 4.5 a7.5 7.5 0 0 1 5.3 12.8" stroke="currentColor" strokeWidth="1.4" fill="none" opacity="0.6"/>
                  <circle cx="8" cy="8.5" r="0.8" fill="currentColor"/>
                  <circle cx="16" cy="9.5" r="0.6" fill="currentColor" opacity="0.7"/>
                  <circle cx="9.5" cy="16" r="0.5" fill="currentColor" opacity="0.5"/>
                </svg>
              </span><span className="btn-label">The Mage's Codex</span>
               <span
                style={{
                  position: 'absolute',
                  right: '12px',
                  width: '33px',
                  height: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.5rem',
                  color: '#ffe9b5',
                  fontWeight: 'bold',
                  letterSpacing: '1px',
                  fontFamily: 'monospace',
                  borderRadius: '4px',
                  border: '1px solid rgba(255, 215, 120, 0.8)',
                  background:
                    'linear-gradient(180deg, #6a3a0f 0%, #2a1203 60%, #1a0b02 100%)',
                  boxSizing: 'border-box',
                  /* ✨ MAIN MAGIC GLOW */
                  boxShadow:
                    '0 0 6px rgba(255, 210, 120, 0.35), 0 0 14px rgba(197, 160, 89, 0.25), inset 0 0 6px rgba(255, 230, 160, 0.15)',
                  /* ✨ TEXT MAGIC */
                  textShadow:
                    '0 0 6px rgba(255, 220, 140, 0.9), 0 0 12px rgba(255, 180, 80, 0.4)',
                  /* ✨ subtle depth */
                  backdropFilter: 'blur(2px)',
                }}
              >
                SHOP
              </span> 
            </button>
            
            <div style={{ display: 'flex', width: '100%', gap: '10px' }}>
              <button 
                className="btn wizard-btn" 
                style={{ flex: 1, margin: 0 }}
                onClick={() => executeWithTransition(() => { setCouncilTab('decrees'); setCouncilNewsOpen(true); })}
              >
                <span className="btn-icon" style={{ display: 'inline-flex', verticalAlign: 'middle', marginRight: '4px' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M12 3 L20 8 H4 Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" fill="rgba(233,196,122,0.12)"/>
                    <line x1="6" y1="8" x2="6" y2="17" stroke="currentColor" strokeWidth="1.5"/>
                    <line x1="10" y1="8" x2="10" y2="17" stroke="currentColor" strokeWidth="1.5"/>
                    <line x1="14" y1="8" x2="14" y2="17" stroke="currentColor" strokeWidth="1.5"/>
                    <line x1="18" y1="8" x2="18" y2="17" stroke="currentColor" strokeWidth="1.5"/>
                    <line x1="4" y1="19" x2="20" y2="19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                </span><span className="btn-label" style={{ color: '#fbcfe8' }}>Council Chronicles</span>
                <span
                  style={{
                    position: 'absolute',
                    right: '12px',
                    width: '33px',
                    height: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.5rem',
                    color: '#ffe9b5',
                    fontWeight: 'bold',
                    letterSpacing: '1px',
                    fontFamily: 'monospace',
                    borderRadius: '4px',
                    border: '1px solid rgba(255, 215, 120, 0.8)',
                    background:
                      'linear-gradient(180deg, #6a3a0f 0%, #2a1203 60%, #1a0b02 100%)',
                    boxSizing: 'border-box',
                    /* ✨ MAIN MAGIC GLOW */
                    boxShadow:
                      '0 0 6px rgba(255, 210, 120, 0.35), 0 0 14px rgba(197, 160, 89, 0.25), inset 0 0 6px rgba(255, 230, 160, 0.15)',
                    /* ✨ TEXT MAGIC */
                    textShadow:
                      '0 0 6px rgba(255, 220, 140, 0.9), 0 0 12px rgba(255, 180, 80, 0.4)',
                    /* ✨ subtle depth */
                    backdropFilter: 'blur(2px)',
                  }}
                >
                  NEWS
                </span> 
              </button>
            </div>

            {/* 📖 GRIMOIRE BUTTON */}
            <button
              className="btn wizard-btn"
              style={{
                marginTop: '6px',
                borderColor: 'rgba(197, 160, 89, 0.7)',
                background: 'linear-gradient(180deg, #1c0e05 0%, #0b0602 100%)',
                color: '#e9c47a',
                letterSpacing: '0.14em',
                position: 'relative',
                overflow: 'hidden',
              }}
              onClick={() => executeWithTransition(() => { setGrimoirePage('cover'); setGrimoireVideoPlaying(false); setShowGrimoireModal(true); })}
            >
              <span style={{ display: 'inline-flex', verticalAlign: 'middle', marginRight: '4px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M4 5.5 Q8 4 12 5.5 V18.5 Q8 17 4 18.5 Z" stroke="currentColor" strokeWidth="1.5" fill="rgba(233,196,122,0.1)"/>
                  <path d="M20 5.5 Q16 4 12 5.5 V18.5 Q16 17 20 18.5 Z" stroke="currentColor" strokeWidth="1.5" fill="rgba(233,196,122,0.1)"/>
                  <line x1="12" y1="5.5" x2="12" y2="18.5" stroke="currentColor" strokeWidth="1.3" opacity="0.5"/>
                </svg>
              </span>
              <span className="btn-label" style={{ color: '#e9c47a' }}>The Archmage's Grimoire</span>
              <span
                style={{
                  position: 'absolute',
                  right: '12px',
                  width: '33px',
                  height: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.5rem',
                  color: '#ffe9b5',
                  fontWeight: 'bold',
                  letterSpacing: '1px',
                  fontFamily: 'monospace',
                  borderRadius: '4px',
                  border: '1px solid rgba(255, 215, 120, 0.8)',
                  background:
                    'linear-gradient(180deg, #6a3a0f 0%, #2a1203 60%, #1a0b02 100%)',
                  boxSizing: 'border-box',
                  /* ✨ MAIN MAGIC GLOW */
                  boxShadow:
                    '0 0 6px rgba(255, 210, 120, 0.35), 0 0 14px rgba(197, 160, 89, 0.25), inset 0 0 6px rgba(255, 230, 160, 0.15)',
                  /* ✨ TEXT MAGIC */
                  textShadow:
                    '0 0 6px rgba(255, 220, 140, 0.9), 0 0 12px rgba(255, 180, 80, 0.4)',
                  /* ✨ subtle depth */
                  backdropFilter: 'blur(2px)',
                }}
              >
                LORE
              </span> 
            </button>

      <div className="mystic-tribute-container">
              <a 
                href="https://ko-fi.com/zidaneee" 
                target="_blank" 
                rel="noopener noreferrer"
                className="mystic-tribute-link tribute-glow-effect" /* 🔥 Idinagdag ang glow class dito */
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textDecoration: 'none' }}
              >
                <span style={{ lineHeight: '1' }}>✦ OFFER ARCANE TRIBUTE TO THE ARCHMAGE ✦</span>
                <span style={{ 
                  fontSize: '11px',     /* Pinaliit nang konti */
                  fontStyle: 'italic',  
                  marginTop: '-4px',    /* 🔥 Negative margin para dikit na dikit! */
                  lineHeight: '1',      /* 🔥 Tinatanggal ang default spacing ng text */
                  opacity: 0.9,         
                  fontWeight: 'normal',
                  letterSpacing: '1px'  /* Konting awang sa letters para madaling basahin kahit maliit */
                }}>
                  Buy me a coffee on Ko-fi — click here.
                </span>
              </a>
            </div>

          </div>
        </div>
      )}

      {/* DYNAMIC ARCANE COUNCIL SCROLL OVERLAY WINDOW */}
      {councilNewsOpen && (
        <div className="council-news-overlay">
          <div className="council-news-box" onClick={e => e.stopPropagation()}>
            <div className="panel-corner pc-tl" />
            <div className="panel-corner pc-tr" />
            <div className="panel-corner pc-bl" />
            <div className="panel-corner pc-br" />

            <div className="section-title" style={{ color: '#ffe6a3', fontSize: '1.25rem', fontFamily: 'Georgia, serif', marginBottom: '14px', textShadow: '0 0 10px rgba(197,160,89,0.5)', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <span style={{ width: '22px', height: '22px', display: 'inline-flex' }}>
                <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M16 4l13 6.6H3L16 4z" fill="currentColor" opacity="0.16" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                  <line x1="7" y1="10.6" x2="7" y2="23" stroke="currentColor" strokeWidth="1.6" />
                  <line x1="13" y1="10.6" x2="13" y2="23" stroke="currentColor" strokeWidth="1.6" />
                  <line x1="19" y1="10.6" x2="19" y2="23" stroke="currentColor" strokeWidth="1.6" />
                  <line x1="25" y1="10.6" x2="25" y2="23" stroke="currentColor" strokeWidth="1.6" />
                  <line x1="3" y1="25.4" x2="29" y2="25.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </span> COUNCIL SANCTUM CHRONICLES
            </div>
            
            <div className="council-tab-headers">
              <button className={`council-tab-btn ${councilTab === 'decrees' ? 'active' : ''}`} onClick={() => setCouncilTab('decrees')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <span style={{ width: '16px', height: '16px', display: 'inline-flex' }}><IconMegaphone /></span> Council Decrees
              </button>
              <button className={`council-tab-btn ${councilTab === 'grimoire' ? 'active' : ''}`} onClick={() => setCouncilTab('grimoire')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <span style={{ width: '16px', height: '16px', display: 'inline-flex' }}><IconScroll /></span> Grimoire Changes
              </button>
            </div>
            
            <div className="council-scroll-logs">
              {loadingNews ? (
                <div style={{ color: '#a78bfa', textAlign: 'center', marginTop: '40px', fontFamily: 'monospace' }}>Chanting divination spell to pull archives...</div>
              ) : activeLogs.length === 0 ? (
                <div style={{ color: 'rgba(167,139,250,0.5)', textAlign: 'center', marginTop: '40px', fontFamily: 'monospace' }}>No records written on the scrolls yet.</div>
              ) : (
                activeLogs.map((item) => (
                  <div className="council-log-item" key={item.id}>
                    <div className="council-log-header" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '13px', height: '13px', display: 'inline-flex' }}><IconSparkleStar /></span> {item.type === 'decree' ? 'DECREE' : 'GRIMOIRE LOG'} • {new Date(item.created_at).toLocaleDateString()}
                    </div>
                    <div className="council-log-title">{item.title?.toUpperCase()}</div>
                    <div className="council-log-desc">{item.description}</div>
                  </div>
                ))
              )}
            </div>
            
           <button className="btn wizard-btn danger-theme" style={{ marginTop: '14px', width: '100%', margin: '14px 0 0 0' }} onClick={() => executeWithTransition(() => setCouncilNewsOpen(false))}>
               ✕ Dismiss Scroll
          </button>
          </div>
        </div>
      )}

      {/* CO-OP CONFIGURATION MENU */}
      {screen === 'coop-menu' && (
        <div className="overlay active">
          <div className="panel wizard-panel">
            <div className="panel-corner pc-tl" />
            <div className="panel-corner pc-tr" />
            <div className="panel-corner pc-bl" />
            <div className="panel-corner pc-br" />

            <div className="section-title" style={{ fontFamily: 'Georgia, serif', color: '#ffe6a3' }}>⚔️ CO-OP COVENANT</div>
            <div className="divider mystic-divider" />

            <div className="field-group" style={{ width: '100%' }}>
              <label className="field-label wizard-field-label">Arcane Identity</label>
              <input 
                className="field-input wizard-field-input" 
                type="text" 
                value={wizardName} 
                onChange={e => setWizardName(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && onAction('host-game', { name: wizardName })}
                placeholder="e.g. Archmage Martel" 
                maxLength={16} 
                style={{ textAlign: 'center', marginBottom: '12px' }}
              />
            </div>
            <button className="btn wizard-btn gold-theme" onClick={() => executeWithTransition(() => onAction('host-game', { name: wizardName }))}>HOST SANCTUM</button>
            
            <div style={{ margin: '12px 0', fontSize: '.7rem', color: '#c4b5fd', fontFamily: 'monospace', letterSpacing: '2px', textAlign: 'center' }}>— OR —</div>
            
            <div className="field-group" style={{ width: '100%' }}>
              <label className="field-label wizard-field-label">Sanctum Code</label>
              <input 
                className="field-input wizard-field-input" 
                type="text" 
                value={joinCode} 
                onChange={e => setJoinCode(e.target.value.toUpperCase())} 
                onKeyDown={e => e.key === 'Enter' && onAction('join-game', { name: wizardName, code: joinCode })}
                placeholder="6-SIGILS CODE" 
                maxLength={6} 
                style={{ textAlign: 'center', letterSpacing: '.2em', marginBottom: '12px' }} 
              />
            </div>
            <button className="btn wizard-btn" onClick={() => executeWithTransition(() => onAction('join-game', { name: wizardName, code: joinCode }))}>Step Into Sanctum</button>
            <button className="btn wizard-btn danger-theme" style={{ marginTop: '10px' }} onClick={() => executeWithTransition(() => setScreen('menu'))}>← Leave Sanctum</button>
          </div>
        </div>
      )}

      {/* MULTIPLAYER LOBBY SCREEN */}
      {screen === 'lobby' && (
        <div className="overlay active">
          <div className="panel wizard-panel">
            <div className="panel-corner pc-tl" />
            <div className="panel-corner pc-tr" />
            <div className="panel-corner pc-bl" />
            <div className="panel-corner pc-br" />

            <div className="section-title" style={{ fontFamily: 'Georgia, serif', color: '#ffe6a3' }}>🌐 Waiting for Player 2</div>
            <div className="divider mystic-divider" />
            <div className="room-code-display" style={{ textShadow: '0 0 15px rgba(167,139,250,0.6)', color: '#ffffff', letterSpacing: '4px', fontSize: '2rem', fontWeight: 'bold', margin: '10px 0', textAlign: 'center' }}>{roomCode}</div>
            <div style={{ fontSize: '.8rem', color: '#c4b5fd', fontStyle: 'italic', marginBottom: '20px', textAlign: 'center' }}>{p2Status || 'Waiting for an ally to connect...'}</div>
            <button className="btn wizard-btn danger-theme" onClick={() => onAction('cancel-lobby')}>✕ Cancel</button>
          </div>
        </div>
      )}
{/* HALL OF LEGENDS LEADERBOARD */}
      {screen === 'leaderboard' && (
        <div className="overlay active">
          <div className="panel wizard-panel" style={{ width: '760px', height: '680px', maxWidth: '95vw', maxHeight: '95vh', boxSizing: 'border-box' }}>
            <div className="panel-corner pc-tl" />
            <div className="panel-corner pc-tr" />
            <div className="panel-corner pc-bl" />
            <div className="panel-corner pc-br" />

            <div className="section-title" style={{ fontFamily: 'Georgia, serif', color: '#ffe6a3', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <span style={{ width: '22px', height: '22px', display: 'inline-flex' }}><IconTrophy /></span> COUNCIL OF THE FALLEN
            </div>
            <div className="lb-description">
              When the final spell fades and the last wave falls,{' '}
              <b style={{ color: '#fef08a', textShadow: '0 0 12px rgba(254, 240, 138, 0.9)' }}>
                only twenty souls shall remain worthy
              </b>. 
              The Council of the Fallen welcomes these Arcane legends, granting them eternal glory beyond the mortal realm.
            </div>
            
            <div className="divider mystic-divider" style={{ margin: '14px 0', flexShrink: 0 }} />
            
            {/* TABS CONTAINER */}
            <div className="council-tab-headers" style={{ marginBottom: '16px', flexShrink: 0 }}>
              <button 
                className={`council-tab-btn ${leaderboardTab === 'solo' ? 'active' : ''}`} 
                onClick={() => setLeaderboardTab('solo')}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <span style={{ width: '16px', height: '16px', display: 'inline-flex' }}><IconWizardHat /></span> Solo Records
              </button>
              <button 
                className={`council-tab-btn ${leaderboardTab === 'coop' ? 'active' : ''}`} 
                onClick={() => setLeaderboardTab('coop')}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <span style={{ width: '16px', height: '16px', display: 'inline-flex' }}><IconSwordsCrossed /></span> Co-op Records
              </button>
            </div>

            {/* SCROLL AREA - Malaki na, sagad pababa, at may margin sa ilalim */}
            <div className="lb-scroll-area">
              {loadingLb ? <div className="lb-loading" style={{ padding: '40px', color: '#a78bfa', fontFamily: 'Georgia', textAlign: 'center' }}>Summoning records from ancient scroll…</div> : (
              <table className="witch-table">
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'center', width: '60px' }}>#</th>
                      <th style={{ textAlign: 'center', width: '70px' }}>Avatar</th>
                      <th style={{ textAlign: 'center' }}>Wizard</th>
                      <th style={{ textAlign: 'center', width: '90px' }}>Level</th>
                      <th style={{ textAlign: 'center', width: '90px' }}>Wave</th>
                      <th style={{ textAlign: 'right', width: '130px' }}>Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.length === 0 ? (
                      <tr><td colSpan="6" style={{ textAlign: 'center', color: 'rgba(167,139,250,0.5)', padding: '30px' }}>No records yet. Be the first legend!</td></tr>
                    ) : (
                      leaderboard.map((row, idx) => {
                        // 🔥 KUNIN ANG EXACT SKIN OBJECT MULA SA METASHOP DATABASE
                        const playerSkin = SKINS_DB.find(s => s.id === (row.skin || 'default')) || SKINS_DB[0];

                        return (
                          <tr key={idx} className={idx === 0 ? 'gold-leader' : idx === 1 ? 'silver-leader' : idx === 2 ? 'bronze-leader' : ''}>
                            <td style={{ fontWeight: 'bold', textAlign: 'center' }}>
                              {idx === 0 ? (
                                <span style={{ width: '20px', height: '20px', display: 'inline-flex', color: '#ffd700' }}>👑</span>
                              ) : idx === 1 ? (
                                <span style={{ width: '18px', height: '18px', display: 'inline-flex', color: '#c0c0c0' }}>🥈</span>
                              ) : idx === 2 ? (
                                <span style={{ width: '18px', height: '18px', display: 'inline-flex', color: '#cd7f32' }}>🥉</span>
                              ) : (
                                `#${idx + 1}`
                              )}
                            </td>
                            
                            {/* 🔥 ANG LIVE CANVAS RENDERER MULA SA METASHOP */}
                            <td style={{ textAlign: 'center', verticalAlign: 'middle', padding: '4px' }}>
                              <div style={{ 
                                width: '50px', height: '50px', margin: '0 auto', 
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                overflow: 'visible'
                              }}>
                                {/* Scale pababa (70% ng orig size) para fit na fit sa table row */}
                                <div style={{ transform: 'scale(0.7)', transformOrigin: 'center', display: 'flex' }}>
                                  <LiveSkinPreview skin={playerSkin} />
                                </div>
                              </div>
                            </td>

                            <td style={{ fontWeight: 600, textAlign: 'center' }}>{row.name || 'Anonymous'}</td>
                            <td style={{ textAlign: 'center' }}>{row.level || 1}</td>
                            <td style={{ textAlign: 'center' }}>{row.wave || 1}</td>
                            <td style={{ fontWeight: 'bold', textAlign: 'right' }}>{(row.score || 0).toLocaleString()}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              )}
            </div>
            
            {/* LEAVE BUTTON - Swak na sa pinakailalim nang may saktong awang sa kahon */}
            <button className="btn wizard-btn danger-theme lb-bottom-btn" onClick={() => executeWithTransition(() => setScreen('menu'))}>← Leave Sanctum</button>
          </div>
        </div>
      )}

      {/* LEVEL UP MODAL PANEL LAYER */}
      {screen === 'levelup' && (
        <div className="overlay active" style={{ background: 'rgba(3, 1, 17, 0.55)', backdropFilter: 'blur(3px)' }}>
          <div className="lu-wrapper">
            <div className="lu-arcane-circle" />
            <div className="lu-title-row">
              <span className="lu-rune-flank">ᛟᛗᛚ</span>
              <div className="lu-title">LEVEL UP — WAVE {hudData?.wave || 1}</div>
              <span className="lu-rune-flank">ᛚᛗᛟ</span>
            </div>
            <div className="lu-subtitle">Choose an Upgrade (Press 1, 2, 3 or Click)</div>
            <div className="lu-rune-strip">ᚠ ᚢ ᚦ ᚨ ᚱ ᚲ ᚷ ᚹ ᚺ ᚾ ᛁ ᛃ ᛇ ᛈ ᛉ ᛊ ᛏ ᛒ ᛖ ᛗ ᛚ ᛟ</div>
            <div className="lu-warning" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><InlineIcon size={15} style={{ color: '#fbbf24' }}><IconWarningRune /></InlineIcon>Game continues – enemies are still moving!</div>

            <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <div style={{ color: '#d946ef', fontFamily: 'monospace', fontWeight: 'bold', textShadow: '0 0 8px rgba(217, 70, 239, 0.6)', fontSize: '0.9rem', display: 'flex', alignItems: 'center' }}>
                <InlineIcon size={15} style={{ color: '#d946ef' }}><IconVoidCrystal /></InlineIcon>Void Crystals: {voidCrystals.toLocaleString()}
              </div>
              <button 
                className="btn wizard-btn lu-reroll-btn" 
                onClick={handleReroll}
                disabled={voidCrystals < 50}
                style={{ 
                  fontSize: '0.75rem',
                  opacity: voidCrystals < 50 ? 0.5 : 1,
                  cursor: voidCrystals < 50 ? 'not-allowed' : 'pointer',
                }}
              >
                <span className="lu-reroll-gem">◆</span>
                <span className="lu-reroll-icon" style={{ display: 'inline-flex', width: '13px', height: '13px', verticalAlign: '-2px' }}><IconRuneDie /></span> Reroll Options (Cost: 50)
                <span className="lu-reroll-gem">◆</span>
              </button>
            </div>
            
              <div className="lu-cards-row">
              {displayedChoices.map((opt, i) => {
                const card = getUpgradeMeta(opt, hudData?.wave || 1);
                return (
                  <div 
                    key={i} 
                    className="lu-card" 
                    style={{ border: '1px solid #c5a059', background: 'linear-gradient(180deg, #1b0c30 0%, #080312 100%)' }} 
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      
                      // 🛑 PIGILAN ANG DOUBLE-CLICK LAG DITO
                      if (upgradeLockRef.current) return; 
                      upgradeLockRef.current = true; // 🔒 I-LOCK AGAD
                      
                      onSelectUpgrade(opt);
                    }}
                  >
                    <span className="lu-corner tl" />
                    <span className="lu-corner tr" />
                    <span className="lu-corner bl" />
                    <span className="lu-corner br" />
                    <div className="lu-card-runes">ᛟ ᚱ ᚨ ᚾ ᛟ</div>
                    <div className="lu-icon-frame">
                      <div className="lu-icon">{card.icon}</div>
                    </div>
                    <div className="lu-card-title" style={{ color: '#ffe6a3' }}>{card.title}</div>
                    <div className="lu-card-desc" style={{ color: '#cbd5e1' }}>{card.desc}</div>
                    <div className="lu-hotkey">{i + 1}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

 {/* GAME OVER SUMMARY SCREEN */}
      {screen === 'gameover' && (
        <div className="overlay active">
          <div className="panel wizard-panel">
            <div className="panel-corner pc-tl" />
            <div className="panel-corner pc-tr" />
            <div className="panel-corner pc-bl" />
            <div className="panel-corner pc-br" />

            {gameOverPhase === 'continue' ? (
              <>
                <div className="menu-title" style={{ color: '#d946ef', textShadow: '0 0 15px rgba(217, 70, 239, 0.4)' }}>CONTINUE?</div>
                <div className="divider mystic-divider" />

                <div style={{ fontSize: '1.2rem', color: '#ffe6a3', textAlign: 'center', marginBottom: '10px', fontFamily: 'Georgia, serif' }}>
                  Revive and Resume Trial
                </div>
                
                <div style={{ fontSize: '1rem', color: '#cbd5e1', textAlign: 'center', marginBottom: '20px', fontFamily: 'monospace', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  Cost: <span style={{ color: '#d946ef', fontWeight: 'bold', display: 'flex', alignItems: 'center', marginLeft: '6px' }}>100 <InlineIcon size={14} style={{ color: '#d946ef', marginLeft: '4px', marginRight: 0 }}><IconVoidCrystal /></InlineIcon></span>
                </div>
                
                <div style={{ fontSize: '0.85rem', color: '#94a3b8', textAlign: 'center', marginBottom: '20px', fontFamily: 'monospace', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  Your Void Crystals: {voidCrystals.toLocaleString()} <InlineIcon size={14} style={{ color: '#94a3b8', marginLeft: '4px', marginRight: 0 }}><IconVoidCrystal /></InlineIcon>
                </div>

                <button 
                  className="btn wizard-btn gold-theme" 
                  disabled={voidCrystals < 100}
                  style={{ opacity: voidCrystals < 100 ? 0.5 : 1, marginBottom: '10px' }}
                  onClick={() => {
                     const currentCrystals = parseInt(localStorage.getItem('arcane_void_crystals') || '0', 10);
                     if (currentCrystals >= 100) {
                         localStorage.setItem('arcane_void_crystals', currentCrystals - 100);
                         setVoidCrystals(currentCrystals - 100);
                         if (window.executeContinueAction) window.executeContinueAction();
                         setScreen('playing');
                     }
                  }}
                >
                  ✦ Pay Void Crystals to Continue ✦
                </button>

                <button 
                  className="btn wizard-btn danger-theme" 
                  onClick={() => setGameOverPhase('summary')}
                >
                  Accept Your Fate
                </button>
              </>
            ) : (
              <>
                <div className="menu-title" style={{ color: '#ef4444', textShadow: '0 0 15px rgba(239,68,68,0.4)' }}>YOU PERISHED</div>
                <div className="divider mystic-divider" />

                {/* 🔥 DAMAGE RECAP TOGGLE WRAPPER */}
                {showDamageRecap ? renderDamageRecap() : (
                  <>
                    <div id="go-score" style={{ fontSize: '1.45rem', margin: '12px 0', fontFamily: 'Georgia', color: '#ffe6a3', textAlign: 'center' }}>
                      Final Score: {(hudData?.score || 0).toLocaleString()}
                    </div>
                    <div style={{ fontSize: '.88rem', color: '#cbd5e1', marginBottom: '18px', fontFamily: 'monospace', textAlign: 'center' }}>
                      Survived to Wave {hudData?.wave || 1}
                    </div>

                    {hudData?.p?.voidCrystals > 0 && (
                       <div style={{ fontSize: '1rem', color: '#d946ef', marginBottom: '18px', fontWeight: 'bold', textAlign: 'center', textShadow: '0 0 8px rgba(217, 70, 239, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                         <InlineIcon size={15} style={{ color: '#d946ef' }}><IconVoidCrystal /></InlineIcon>+{hudData.p.voidCrystals} Void Crystals Retrieved
                       </div>
                    )}

                    {isCoop && (
                      <div style={{ fontSize: '.85rem', color: '#fca5a5', marginBottom: '10px', fontStyle: 'italic', textAlign: 'center' }}>
                        {restartVotes} / 2 voted to restart the game
                      </div>
                    )}
                  </>
                )}

                <div className="divider mystic-divider" style={{ margin: '15px 0' }} />

                {/* 🔥 THE TOGGLE BUTTON */}
                <button 
                  className="btn wizard-btn" 
                  onClick={() => setShowDamageRecap(!showDamageRecap)}
                  style={{ marginBottom: '15px', borderStyle: 'dashed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  {showDamageRecap ? (
                    <><InlineIcon size={14}><IconReturnArrow /></InlineIcon>Return to Summary</>
                  ) : (
                    <><InlineIcon size={14}><IconRecapChart /></InlineIcon>View Damage Recap</>
                  )}
                </button>

                {hasSupabase && (
                  <div id="go-submit" style={{ marginBottom: '14px', width: '100%' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label className="wizard-field-label" style={{ textAlign: 'center' }}>Record Name on Tombstone</label>
                      
                      {!isScoreSubmitted ? (
                        <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                          <input 
                            className="field-input wizard-field-input" 
                            type="text" 
                            value={wizardName} 
                            maxLength={15}
                            onChange={e => setWizardName(e.target.value)} 
                            onKeyDown={e => e.key === 'Enter' && handleSubmitScore()}
                            placeholder="e.g. Archmage Martel" 
                            style={{ flex: 1 }}
                          />
                          <button className="btn wizard-btn gold-theme" onClick={handleSubmitScore} style={{ margin: 0, width: 'auto', padding: '0 20px' }}>Submit</button>
                        </div>
                      ) : null}

                    </div>
                    <div style={{ fontSize: '.75rem', color: '#a78bfa', marginTop: '6px', minHeight: '1em', fontFamily: 'monospace', textAlign: 'center' }}>{submitStatus}</div>
                  </div>
                )}

                {isCoop && (!hudData?.p?.dead || !hudData?.p2?.dead) && (
                  <button className="btn wizard-btn" style={{ borderColor: '#38bdf8', color: '#38bdf8', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setScreen('playing')}>
                    <InlineIcon size={14}><IconSpectateEye /></InlineIcon>Spectate Partner
                  </button>
                )}

                <button className="btn wizard-btn gold-theme" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => executeWithTransition(() => onAction(isCoop ? 'restart-coop' : 'start-solo', { name: wizardName }))}>
                  <InlineIcon size={14}><IconRestartCycle /></InlineIcon>{isCoop ? 'Vote Restart' : 'Play Again'}
                </button>
                <button className="btn wizard-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => executeWithTransition(() => setScreen('menu'))}><InlineIcon size={14}><IconSanctumHome /></InlineIcon>Main Menu</button>
              </>
            )}
          </div>
        </div>
      )}

{/* MATCH PAUSE OVERLAY */}
      {screen === 'pause' && (
        <div id="pause-overlay" className="overlay active">
          
          {/* TANGGALIN: style={{ width: '320px' }} */}
          {/* IPALIT ITO: className="panel wizard-panel pause-panel" */}
          <div className="panel wizard-panel pause-panel">
            <div className="panel-corner pc-tl" />
            <div className="panel-corner pc-tr" />
            <div className="panel-corner pc-bl" />
            <div className="panel-corner pc-br" />

            {/* Idinagdag ang pause-title na class */}
            <div className="section-title pause-title" style={{ fontFamily: 'Georgia, serif', color: '#ffe6a3' }}>GAME PAUSED</div>
            <div className="divider mystic-divider" />
            
            <button 
              className="btn wizard-btn" 
              onClick={() => {
                if (window.executeNetworkResumeAction) {
                  window.executeNetworkResumeAction();
                } else {
                  setScreen('playing');
                }
              }}
            >
              Resume Trial
            </button>
            
            <button 
              className="btn wizard-btn danger-theme" 
              onClick={() => {
                executeWithTransition(() => {
                  if (window.executeNetworkExitAction) {
                    window.executeNetworkExitAction();
                  } else {
                    setScreen('menu');
                    if (onAction) {
                      try { onAction('exit-match'); } catch(e) {}
                    }
                  }
                });
              }}
            >
              Break Covenant
            </button>
          </div>
        </div>
      )}

{/* ====================================================================
          📖 THE ARCHMAGE'S GRIMOIRE — BOOK MODAL
          ==================================================================== */}
      {showGrimoireModal && (
        <div
          className="grimoire-modal-overlay" /* 👈 Bagong class para i-handle ang overlay scrolling */
          onClick={(e) => {
            e.stopPropagation(); 
            ;
          }}
          style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            background: 'rgba(3,1,7,0.88)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            padding: '12px',
            pointerEvents: 'auto'
          }}
        >
          {/* Grimoire Book Container */}
          <div
            className="grimoire-book"
            onClick={e => e.stopPropagation()}
            style={{
              position: 'relative',
              width: 'min(700px, 96vw)',
              minHeight: 'min(500px, 80vh)',
              maxHeight: '90vh',
              display: 'flex',
              boxSizing: 'border-box',
            }}
          >
            {/* 📌 BOOKMARK TABS SA KALIWANG GILID */}
          <div className="grimoire-tabs-container" style={{ position: 'absolute', left: '-42px', top: '40px', display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 0 }}>
              <button className="mobile-tab-btn" 
                onClick={() => setActiveGrimoireTab('lore')}
                style={{
                  padding: '20px 8px', writingMode: 'vertical-rl', transform: 'rotate(180deg)',
                  background: activeGrimoireTab === 'lore' ? '#1e1005' : '#0a0601',
                  color: activeGrimoireTab === 'lore' ? '#ffe6a3' : '#a0784a',
                  border: '1.5px solid #c5a059', borderRight: 'none', borderRadius: '8px 0 0 8px',
                  fontFamily: 'Georgia, serif', fontWeight: 'bold', letterSpacing: '2px', cursor: 'pointer',
                  boxShadow: activeGrimoireTab === 'lore' ? '-4px 0 10px rgba(197,160,89,0.3)' : 'none',
                  transition: 'all 0.3s'
                }}>
                CHRONICLES
              </button>
              <button className="mobile-tab-btn"
                onClick={() => setActiveGrimoireTab('bestiary')}
                style={{
                  padding: '20px 8px', writingMode: 'vertical-rl', transform: 'rotate(180deg)',
                  background: activeGrimoireTab === 'bestiary' ? '#1e1005' : '#0a0601',
                  color: activeGrimoireTab === 'bestiary' ? '#ffe6a3' : '#a0784a',
                  border: '1.5px solid #c5a059', borderRight: 'none', borderRadius: '8px 0 0 8px',
                  fontFamily: 'Georgia, serif', fontWeight: 'bold', letterSpacing: '2px', cursor: 'pointer',
                  boxShadow: activeGrimoireTab === 'bestiary' ? '-4px 0 10px rgba(197,160,89,0.3)' : 'none',
                  transition: 'all 0.3s'
                }}>
                BESTIARY
              </button>
            </div>

            {/* 🔄 CONDITIONAL RENDERING NG CONTENT */}
            {activeGrimoireTab === 'lore' ? (
              <>
                {/* ── LEFT PAGE (LORE) ── */}
                <div className="grimoire-page grimoire-left">
                  <div className="grimoire-page-inner">
                    {/* Rune border top */}
                    <div className="grimoire-rune-strip" style={{ marginBottom: 12 }}>
                      ᚠ ᚢ ᚦ ᚨ ᚱ ᚲ ᚷ ᚹ ᚺ ᚾ ᛁ ᛃ ᛇ ᛈ ᛉ ᛊ ᛏ ᛒ ᛖ ᛗ ᛚ ᛟ
                    </div>

                    {/* Book title */}
                    <div style={{ textAlign: 'center', marginBottom: 14 }}>
                      <div style={{ fontSize: '0.6rem', letterSpacing: '0.35em', color: '#a0784a', fontFamily: 'Georgia, serif', textTransform: 'uppercase', marginBottom: 4 }}>
                        Codex Arcanum • Vol. I
                      </div>
                      <div style={{
                        fontFamily: 'Georgia, serif', fontSize: 'clamp(1rem, 3vw, 1.5rem)',
                        color: '#e9c47a', fontWeight: 'bold',
                        textShadow: '0 0 12px rgba(233,196,122,0.5)',
                        lineHeight: 1.2, letterSpacing: '0.05em',
                      }}>
                        The Archmage's<br/>Grimoire
                      </div>
                    </div>

                    <div className="grimoire-divider" />

                    {/* Sigil / seal illustration */}
                    <div style={{ display: 'flex', justifyContent: 'center', margin: '10px 0' }}>
                      <svg width="90" height="90" viewBox="0 0 90 90" style={{ opacity: 0.85 }}>
                        <circle cx="45" cy="45" r="42" fill="none" stroke="#c5a059" strokeWidth="0.8" />
                        <circle cx="45" cy="45" r="34" fill="none" stroke="#a0784a" strokeWidth="0.5" strokeDasharray="3 4" />
                        <circle cx="45" cy="45" r="22" fill="none" stroke="#c5a059" strokeWidth="0.8" />
                        <polygon points="45,8 52,32 77,32 56,48 64,72 45,57 26,72 34,48 13,32 38,32" fill="none" stroke="#e9c47a" strokeWidth="0.7" />
                        <circle cx="45" cy="45" r="5" fill="#c5a059" opacity="0.6" />
                        <text x="45" y="84" textAnchor="middle" fill="#a0784a" fontSize="7" fontFamily="serif" letterSpacing="2">✦ ARCANA ✦</text>
                      </svg>
                    </div>

                    {/* Lore text */}
                    <div style={{
                      fontFamily: 'Georgia, serif', fontSize: 'clamp(0.62rem, 1.5vw, 0.78rem)',
                      color: '#c9a96e', lineHeight: 1.7, textAlign: 'justify',
                      flex: 1, overflow: 'hidden',
                    }}>
                      <p style={{ marginBottom: 8, marginTop: 0 }}>
                        <em>"In the age before the Shattering, the Archmage sealed the forbidden rites within these pages — bound by seven layers of celestial rune-lock, warded against unworthy eyes..."</em>
                      </p>
                      <p style={{ marginTop: 0, marginBottom: 0 }}>
                        You who hold this tome: the Last Covenant awaits. The Void stirs beyond the veil. 
                        Read well, apprentice — for knowledge is the only armor that endures.
                      </p>
                    </div>

                    <div className="grimoire-divider" style={{ marginTop: 'auto', paddingTop: 10 }} />

                    {/* Rune strip bottom */}
                    <div className="grimoire-rune-strip" style={{ marginTop: 8 }}>
                      ᛟ ✦ ᛞ ᛜ ᛚ ᛗ ᛖ ᛒ ᛏ ᛊ ᛉ ᛈ ᛇ ᛃ ᛁ ᚾ ᚺ ᚹ ✦ ᛟ
                    </div>
                    <div className="grimoire-page-num">I</div>
                  </div>
                </div>

                {/* ── SPINE ── */}
                <div className="grimoire-spine">
                  <div className="grimoire-spine-inner">
                    <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', letterSpacing: '0.2em', fontSize: '0.55rem', color: '#a0784a', fontFamily: 'Georgia, serif', whiteSpace: 'nowrap' }}>
                      ✦ CODEX ARCANUM ✦
                    </div>
                  </div>
                </div>

                {/* ── RIGHT PAGE (VIDEO) ── */}
                <div className="grimoire-page grimoire-right">
                  <div className="grimoire-page-inner">
                    {/* Rune strip top */}
                    <div className="grimoire-rune-strip" style={{ marginBottom: 10 }}>
                      ᚠ ᚢ ᛁ ᛃ ᛇ ᚱ ᚲ ᚷ ✦ ᛊ ᛏ ᛒ ᛖ ᛗ ᛚ ᛟ ᛞ ᛜ ✦ ᚦ
                    </div>

                    {/* Section heading */}
                    <div style={{
                      textAlign: 'center', fontFamily: 'Georgia, serif',
                      fontSize: '0.75rem', letterSpacing: '0.25em', color: '#e9c47a',
                      textTransform: 'uppercase', marginBottom: 10,
                      textShadow: '0 0 8px rgba(233,196,122,0.3)',
                    }}>
                      ✦ Chronicle of the Sanctum ✦
                    </div>

                    {/* VIDEO PLAYER area */}
                    <div style={{ position: 'relative', marginBottom: 10, zIndex: 10 }}>
                      {!grimoireVideoPlaying ? (
                        <div
                          className="grimoire-video-thumb"
                          onClick={(e) => { e.stopPropagation(); setGrimoireVideoPlaying(true); }}
                          role="button"
                          aria-label="Play intro cinematic"
                          style={{ cursor: 'pointer', position: 'relative', zIndex: 10 }}
                        >
                          <div style={{
                            position: 'absolute', inset: 0, borderRadius: 4,
                            background: 'radial-gradient(ellipse at 50% 40%, #2a1060 0%, #0d0520 60%, #050110 100%)',
                            pointerEvents: 'none',
                          }} />
                          <svg
                            width="64" height="64" viewBox="0 0 64 64"
                            style={{ position: 'relative', zIndex: 2, animation: 'grimoire-spin 8s linear infinite', pointerEvents: 'none' }}
                          >
                            <circle cx="32" cy="32" r="30" fill="none" stroke="#7c3aed" strokeWidth="0.8" strokeDasharray="4 3" />
                            <circle cx="32" cy="32" r="22" fill="none" stroke="#c5a059" strokeWidth="0.8" />
                            <circle cx="32" cy="32" r="12" fill="none" stroke="#a855f7" strokeWidth="0.6" strokeDasharray="2 2" />
                            <circle cx="32" cy="32" r="5" fill="#7c3aed" opacity="0.8" />
                            <polygon points="32,4 36,22 54,22 40,34 46,52 32,42 18,52 24,34 10,22 28,22" fill="none" stroke="#ffe6a3" strokeWidth="0.6" />
                          </svg>
                          <div style={{
                            position: 'relative', zIndex: 2, marginTop: 8,
                            fontFamily: 'Georgia, serif', fontSize: '0.75rem',
                            color: '#ffe6a3', letterSpacing: '0.15em', textTransform: 'uppercase',
                            textShadow: '0 0 10px rgba(255,230,163,0.6)',
                            pointerEvents: 'none',
                          }}>
                            ▶ Reveal the Sanctum
                          </div>
                          <div style={{ position: 'relative', zIndex: 2, fontSize: '0.6rem', color: '#a0784a', fontFamily: 'monospace', marginTop: 4, pointerEvents: 'none' }}>
                            tap to unveil the arcane vision
                          </div>
                        </div>
                      ) : (
                        <div style={{ position: 'relative', borderRadius: 4, overflow: 'hidden', border: '1px solid rgba(197,160,89,0.4)', zIndex: 10 }}>
                          <video
                            autoPlay
                            playsInline
                            controls
                            src="/intro.mov"
                            style={{ width: '100%', display: 'block', maxHeight: '200px', objectFit: 'cover', background: '#030107', position: 'relative', zIndex: 10 }}
                            onEnded={() => setGrimoireVideoPlaying(false)}
                          />
                          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', boxShadow: 'inset 0 0 18px rgba(197,160,89,0.15)', borderRadius: 4, zIndex: 11 }} />
                        </div>
                      )}
                    </div>

                    <div style={{
                      fontFamily: 'Georgia, serif', fontSize: 'clamp(0.6rem, 1.4vw, 0.72rem)',
                      color: '#a0784a', textAlign: 'center', fontStyle: 'italic',
                      marginBottom: 8, lineHeight: 1.5,
                    }}>
                      A vision from the Age of the Arcane War.<br/>
                      <em>"The last citadel fell on the night of the Black Moon..."</em>
                    </div>

                    <div className="grimoire-divider" />

                    <div style={{
                      fontFamily: 'Georgia, serif', fontSize: 'clamp(0.6rem, 1.4vw, 0.72rem)',
                      color: '#c9a96e', lineHeight: 1.65, flex: 1,
                      textAlign: 'justify', overflow: 'hidden',
                    }}>
                      <p style={{ margin: '8px 0 0 0' }}>
                        The Void does not sleep. Each wave that crashes upon the Sanctum walls is a test — 
                        a decree from the Ancient Council that only the worthy shall survive the Trial of Echoes.
                      </p>
                    </div>

                    <button
                        className="btn wizard-btn danger-theme"
                        style={{ marginTop: 'auto', marginBottom: 0, fontSize: '0.72rem', padding: '8px 14px', position: 'relative', zIndex: 10, pointerEvents: 'all' }}
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          executeWithTransition(() => {
                            setShowGrimoireModal(false); 
                            setGrimoireVideoPlaying(false);
                          }); 
                        }}
                      >
                        ✕ Seal the Grimoire
                      </button>

                    <div className="grimoire-rune-strip" style={{ marginTop: 8 }}>
                      ᛟ ✦ ᛞ ᛜ ᛚ ᛗ ᛖ ᛒ ᛏ ᛊ ᛉ ᛈ ᛇ ᛃ ᛁ ᚾ ᚺ ᚹ ✦ ᛟ
                    </div>
                    <div className="grimoire-page-num">II</div>
                  </div>
                </div>
              </>
            ) : (
              <Bestiary /> /* 🩸 DITO PAPASOK YUNG GINAWA NATING MONSTER LOGBOOK FILE */
            )}

          </div>

          {/* ── GRIMOIRE STYLES ── */}
          <style>{`
            @keyframes grimoire-spin {
              from { transform: rotate(0deg); }
              to   { transform: rotate(360deg); }
            }
            @keyframes grimoire-glow-pulse {
              0%, 100% { box-shadow: 0 0 20px rgba(197,160,89,0.25), inset 0 0 20px rgba(0,0,0,0.9); }
              50%       { box-shadow: 0 0 40px rgba(197,160,89,0.45), inset 0 0 25px rgba(124,58,237,0.1); }
            }

            .grimoire-book {
              box-shadow: 0 0 40px rgba(124,58,237,0.35), 0 8px 32px rgba(0,0,0,0.9);
            }

            .grimoire-page {
              flex: 1;
              background: radial-gradient(circle at 50% 20%, #1e1005 0%, #120a03 60%, #0a0601 100%);
              border: 1.5px solid #c5a059;
              box-sizing: border-box;
              position: relative;
              overflow: visible;
              animation: grimoire-glow-pulse 6s ease-in-out infinite;
            }
            .grimoire-page::before {
              content: '';
              position: absolute; inset: 5px;
              border: 0.5px dashed rgba(197,160,89,0.18);
              border-radius: 2px; pointer-events: none; z-index: 0;
            }

            .grimoire-left  { border-radius: 8px 0 0 8px; border-right: none; overflow: hidden; }
            .grimoire-right {
              border-radius: 0 8px 8px 0; border-left: none;
              overflow: visible;
            }

            .grimoire-left::after, .grimoire-right::after {
              content: '';
              position: absolute; inset: 0; pointer-events: none; z-index: 0;
              background: repeating-linear-gradient(
                0deg,
                transparent,
                transparent 22px,
                rgba(197,160,89,0.03) 22px,
                rgba(197,160,89,0.03) 23px
              );
            }

            .grimoire-page-inner {
              position: relative;
              z-index: 5;
              padding: clamp(12px, 3vw, 22px);
              height: 100%; box-sizing: border-box;
              display: flex; flex-direction: column;
            }

            .grimoire-spine {
              width: clamp(14px, 3vw, 22px);
              background: linear-gradient(90deg, #0a0601 0%, #2a1a06 40%, #1a0e03 60%, #0a0601 100%);
              border-top: 1.5px solid #c5a059;
              border-bottom: 1.5px solid #c5a059;
              position: relative; z-index: 2;
              box-shadow: inset 2px 0 8px rgba(0,0,0,0.8), inset -2px 0 8px rgba(0,0,0,0.8);
              display: flex; align-items: center; justify-content: center;
            }
            .grimoire-spine-inner {
              width: 100%; height: 100%;
              display: flex; align-items: center; justify-content: center;
              border-left:  0.5px solid rgba(197,160,89,0.3);
              border-right: 0.5px solid rgba(197,160,89,0.3);
            }

            .grimoire-rune-strip {
              font-family: serif; font-size: 0.55rem; color: rgba(160,120,74,0.55);
              letter-spacing: 0.1em; text-align: center; line-height: 1;
              user-select: none; white-space: nowrap; overflow: hidden;
            }

            .grimoire-divider {
              height: 1px;
              background: linear-gradient(90deg, transparent 0%, #c5a059 30%, #e9c47a 50%, #c5a059 70%, transparent 100%);
              opacity: 0.5; width: 100%; margin: 4px 0;
            }

            .grimoire-page-num {
              text-align: center; font-family: 'Georgia', serif;
              font-size: 0.6rem; color: rgba(160,120,74,0.5);
              letter-spacing: 0.3em; margin-top: 4px;
            }

            .grimoire-video-thumb {
              width: 100%; aspect-ratio: 16/9; min-height: 100px;
              border: 1px solid rgba(197,160,89,0.4); border-radius: 4px;
              display: flex; flex-direction: column; align-items: center; justify-content: center;
              cursor: pointer; position: relative;
              overflow: hidden;
              transition: border-color 0.3s ease, box-shadow 0.3s ease;
              pointer-events: all;
              z-index: 10;
              -webkit-tap-highlight-color: rgba(197,160,89,0.2);
            }
            .grimoire-video-thumb:hover {
              border-color: #e9c47a;
              box-shadow: 0 0 18px rgba(197,160,89,0.3), inset 0 0 20px rgba(124,58,237,0.15);
            }
            .grimoire-video-thumb:active {
              border-color: #ffe6a3;
              box-shadow: 0 0 28px rgba(197,160,89,0.5);
            }

            @media (max-width: 480px) {
              .grimoire-book   { flex-direction: column !important; }
              .grimoire-left   { border-radius: 8px 8px 0 0 !important; border-right: 1.5px solid #c5a059 !important; border-bottom: none !important; }
              .grimoire-right  { border-radius: 0 0 8px 8px !important; border-left:  1.5px solid #c5a059 !important; border-top:    none !important; }
              .grimoire-spine  { width: 100% !important; height: clamp(12px, 3vw, 18px) !important; flex-direction: row !important; }
              .grimoire-spine div { writing-mode: horizontal-tb !important; transform: none !important; }
            }

            /* 🔥 PURE CSS MOBILE RESPONSIVE OVERRIDES (GRIMOIRE) 🔥 */
            
            /* 1. PORTRAIT FIX: Native overlay scroll, expand full height, tabs at top */
            @media (max-width: 768px) and (orientation: portrait) {
              .grimoire-modal-overlay {
                align-items: flex-start !important;
                padding-top: 65px !important; /* Space para hindi makain ang tabs sa taas */
                padding-bottom: 40px !important;
                overflow-y: auto !important;
                overflow-x: hidden !important;
              }
              .grimoire-book { 
                flex-direction: column !important; 
                height: auto !important;
                max-height: none !important; /* Tanggalin ang height restriction para mag-expand */
                margin-top: 0 !important;
                overflow: visible !important; /* 👈 MUST BE VISIBLE FOR TABS TO SHOW! */
              }
              .grimoire-page {
                flex: none !important;
                min-height: auto !important;
                height: auto !important;
              }
              .grimoire-left { 
                border-radius: 8px 8px 0 0 !important; 
                border-right: 1.5px solid #c5a059 !important; 
                border-bottom: 1px dashed rgba(197,160,89,0.4) !important; 
              }
              .grimoire-right { 
                border-radius: 0 0 8px 8px !important; 
                border-left: 1.5px solid #c5a059 !important; 
                border-top: none !important; 
              }
              .grimoire-spine { 
                display: none !important; 
              }
              .grimoire-tabs-container {
                flex-direction: row !important;
                top: -42px !important;
                left: 0 !important;
                width: 100% !important;
                justify-content: center !important;
              }
              .mobile-tab-btn {
                writing-mode: horizontal-tb !important;
                transform: none !important;
                padding: 10px 16px !important;
                border-radius: 8px 8px 0 0 !important;
                border-right: 1.5px solid #c5a059 !important;
                border-bottom: none !important;
                height: auto !important;
              }
              .grimoire-page-inner {
                height: auto !important;
                overflow: visible !important; /* Hayaan lang na i-stretch ng content ang container */
              }
            }

            /* 2. LANDSCAPE FIX: Prevent cutoff, restrict height, icon tabs */
            @media (max-width: 932px) and (orientation: landscape) {
              .grimoire-book {
                margin-left: 45px !important; 
                width: calc(100vw - 70px) !important; 
                min-height: 0 !important;     
                height: 85svh !important;     
                max-height: 85svh !important; 
                overflow: visible !important; /* 👈 Ensure tabs don't clip left */
              }
              .grimoire-tabs-container {
                left: -38px !important; 
              }
              .mobile-tab-btn {
                font-size: 0 !important;      
                padding: 12px 6px !important; 
                writing-mode: horizontal-tb !important; 
                transform: none !important; 
                min-width: 38px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
              }
              .mobile-tab-btn:nth-child(1)::after {
                content: '📜'; 
                font-size: 1.2rem !important;
              }
              .mobile-tab-btn:nth-child(2)::after {
                content: '🦇'; 
                font-size: 1.2rem !important;
              }
            }

            /* 3. UNIVERSAL PAGE CLIPPING FIX */
            @media (max-width: 932px) {
              .grimoire-page-inner {
                overflow-y: auto !important;  
                padding: 16px !important; 
              }
            }
          `}</style>
        </div>
      )}

 {/* ====================================================================
          🌌 IDLE TRANSITION TO INTROSCREEN (ARCANE / FRIEREN STYLE)
          ==================================================================== */}
      {isTransitioning && (
        <div className="arcane-idle-transition" style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999999,
          pointerEvents: 'all',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden'
        }}>
          {/* Ethereal Spell Rings */}
          <div className="idle-magic-ring outer"></div>
          <div className="idle-magic-ring inner"></div>
          <div className="idle-magic-flash"></div>

          {/* Drifting Mana Particles */}
          <div className="mana-particle p1"></div>
          <div className="mana-particle p2"></div>
          <div className="mana-particle p3"></div>
          <div className="mana-particle p4"></div>
          <div className="mana-particle p5"></div>

          <style>{`
            /* 1. Deep Void Gradient Fade */
            .arcane-idle-transition {
              background: radial-gradient(circle at center, rgba(26, 11, 46, 0) 0%, rgba(3, 1, 7, 0) 100%);
              animation: voidFadeIn 1s cubic-bezier(0.4, 0, 0.2, 1) forwards;
            }

            /* 2. Expanding Ethereal Rings */
            .idle-magic-ring {
              position: absolute;
              border-radius: 50%;
              opacity: 0;
            }
            .idle-magic-ring.outer {
              width: 80px;
              height: 80px;
              border: 2px solid rgba(255, 230, 163, 0.9); /* Pale Gold */
              box-shadow: 0 0 25px rgba(168, 85, 247, 0.6), inset 0 0 15px rgba(168, 85, 247, 0.4); /* Purple Aura */
              animation: spellExpand 1s cubic-bezier(0.1, 0.8, 0.3, 1) forwards;
            }
            .idle-magic-ring.inner {
              width: 40px;
              height: 40px;
              border: 1px dashed rgba(192, 132, 252, 0.8);
              animation: spellExpandInner 1s cubic-bezier(0.1, 0.8, 0.3, 1) forwards;
              animation-delay: 0.05s;
            }

            /* 3. Central Flash (Like casting a sleep spell) */
            .idle-magic-flash {
              position: absolute;
              width: 4px;
              height: 4px;
              background: #fff;
              border-radius: 50%;
              box-shadow: 0 0 40px 20px rgba(255, 230, 163, 0.8);
              animation: starFlash 1s cubic-bezier(0.4, 0, 0.2, 1) forwards;
            }

            /* 4. Drifting Mana Particles (Frieren Vibe) */
            .mana-particle {
              position: absolute;
              background: #ffe6a3;
              border-radius: 50%;
              box-shadow: 0 0 8px #ffe6a3, 0 0 15px #a855f7;
              opacity: 0;
            }
            .p1 { width: 4px; height: 4px; top: 55%; left: 45%; animation: floatMana 0.8s ease-out 0.1s forwards; }
            .p2 { width: 6px; height: 6px; top: 60%; left: 52%; animation: floatMana 0.9s ease-out 0.15s forwards; }
            .p3 { width: 3px; height: 3px; top: 48%; left: 55%; animation: floatMana 0.7s ease-out 0.05s forwards; }
            .p4 { width: 5px; height: 5px; top: 65%; left: 48%; animation: floatMana 0.85s ease-out 0.2s forwards; }
            .p5 { width: 4px; height: 4px; top: 50%; left: 42%; animation: floatMana 0.75s ease-out 0.1s forwards; }

            /* ================= ANIMATIONS ================= */
            @keyframes voidFadeIn {
              0% { opacity: 0; background: radial-gradient(circle at center, rgba(26, 11, 46, 0) 0%, rgba(3, 1, 7, 0) 100%); }
              100% { opacity: 1; background: radial-gradient(circle at center, rgba(26, 11, 46, 1) 0%, rgba(3, 1, 7, 1) 100%); }
            }
            @keyframes spellExpand {
              0% { transform: scale(0.5) rotate(0deg); opacity: 1; border-width: 4px; }
              100% { transform: scale(15) rotate(180deg); opacity: 0; border-width: 0.5px; }
            }
            @keyframes spellExpandInner {
              0% { transform: scale(0.5) rotate(0deg); opacity: 1; }
              100% { transform: scale(10) rotate(-180deg); opacity: 0; }
            }
            @keyframes starFlash {
              0% { transform: scale(0); opacity: 1; }
              40% { transform: scale(2); opacity: 1; }
              100% { transform: scale(0); opacity: 0; }
            }
            @keyframes floatMana {
              0% { transform: translateY(0) scale(1); opacity: 1; }
              100% { transform: translateY(-80px) scale(0.2); opacity: 0; }
            }
          `}</style>
        </div>
      )}
    
    </div>
  );
}