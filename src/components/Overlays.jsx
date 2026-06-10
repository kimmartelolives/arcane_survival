import React, { useState, useEffect } from 'react';
import { sbGet, sbPost, hasSupabase, supabase, sbWatchTable } from '../services/supabase';

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

  // I-sync ang local field kapag may nakuhang global name prop galing sa App level
  useEffect(() => {
    if (initialWizardName) {
      setWizardName(initialWizardName);
    }
  }, [initialWizardName]);

useEffect(() => {
    if (screen === 'leaderboard') {
      // Create a fetch function that accepts a 'silent' parameter
      const fetchLeaderboard = (isSilent = false) => {
        if (!isSilent) setLoadingLb(true);
        
        // Added mode filter to the endpoint based on the active tab
        sbGet(`/rest/v1/leaderboard?select=name,score,wave,level,mode&mode=eq.${leaderboardTab}&order=score.desc&limit=20`)
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
      if (['1', '2', '3'].includes(e.key)) {
        const index = parseInt(e.key, 10) - 1;
        const choices = levelUpOptions || [];
        if (choices[index]) {
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

    setSubmitStatus('Checking ancient records...');

    try {
      // 1. Hanapin kung may existing record na ang pangalan na ito gamit ang sbGet
      const existingData = await sbGet(`/rest/v1/leaderboard?select=id,score&name=ilike.${encodeURIComponent(nameToSubmit)}`);

      // 2. Kung MAY NAHANAP na existing record
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
              mode: isCoop ? 'coop' : 'solo'
            })
            .eq('id', existingRecord.id);

          if (!error) {
            setSubmitStatus(`✦ New personal best! Overwrote previous score of ${existingRecord.score}.`);
            setIsScoreSubmitted(true);
          } else {
            console.error(error);
            setSubmitStatus('Failed to overwrite record.');
          }
        } else {
          setSubmitStatus(`A higher record (${existingRecord.score}) already exists for this name.`);
        }
      } 
      
      else {
        const ok = await sbPost('/rest/v1/leaderboard', {
          name: nameToSubmit, 
          score: newScore, 
          wave: hudData?.wave || 1, 
          level: hudData?.p?.level || 1, 
          mode: isCoop ? 'coop' : 'solo'
        });
        
        if (ok) {
          setSubmitStatus('✦ Name etched into the Tombstone successfully!');
          setIsScoreSubmitted(true);
        } else {
          setSubmitStatus('Failed submission.');
        }
      }

    } catch (err) {
      console.error("Error submitting score:", err);
      setSubmitStatus('Failed to access the Tombstone. Try again.');
    }
  };

  const getUpgradeMeta = (rawString) => {
    const normalize = String(rawString || '').toLowerCase().trim();
    
    if (normalize.includes('rate') || normalize.includes('rapid') || normalize.includes('fire')) {
      return { icon: '⚡', title: 'RAPID FIRE', desc: 'ATTACK COOLDOWN RATE -0.1s' };
    }
    if (normalize.includes('damage') || normalize.includes('might') || normalize.includes('increase')) {
      return { icon: '🔮', title: 'ARCANE MIGHT', desc: 'BOLT DAMAGE +14 POINTS' };
    }
    if (normalize.includes('hp') || normalize.includes('vitality') || normalize.includes('max')) {
      return { icon: '💛', title: 'VITALITY', desc: 'MAX HP +25 & FULL HEAL' };
    }
    if (normalize.includes('multi') || normalize.includes('shot') || normalize.includes('gain') || normalize.includes('-')) {
      return { icon: '🏹', title: 'SPLIT BOLT', desc: 'FIRE AN ADDITIONAL PROJECTILE' };
    }
    return { icon: '📜', title: String(rawString).toUpperCase(), desc: 'ARCANE COVENANT BLESSING' };
  };

  if (screen === 'playing') return null;

  const medals = ['🥇', '🥈', '🥉'];
  const displayedChoices = (levelUpOptions || []).slice(0, 3);
  const restartVotes = isCoop ? [hudData?.coopVotes?.p1, hudData?.coopVotes?.p2].filter(Boolean).length : 0;

  const activeLogs = newsData.filter(item => 
    councilTab === 'decrees' ? item.type === 'decree' : item.type === 'grimoire'
  );

  return (
    <div id="overlays">
<style>{`
        .lu-wrapper { text-align: center; max-width: 960px; width: 100%; padding: 20px; }
        .lu-title { font-size: 2.35rem; font-weight: 800; color: #fef08a; text-shadow: 0 0 20px rgba(251,240,138,0.3); margin-bottom: 8px; letter-spacing: 0.05em; font-family: Georgia, serif; text-transform: uppercase; }
        .lu-subtitle { font-size: 0.85rem; color: #cbd5e1; letter-spacing: 0.08em; margin-bottom: 4px; opacity: 0.9; text-transform: uppercase; font-family: Georgia, serif; }
        .lu-warning { font-size: 0.72rem; color: #eab308; opacity: 0.85; margin-bottom: 28px; font-family: monospace; letter-spacing: 0.05em; font-weight: bold; }
        .lu-cards-row { display: flex; justify-content: center; gap: 24px; width: 100%; flex-wrap: wrap; }
        .lu-card { background: linear-gradient(135deg, #3b117b 0%, #1e0a45 100%); border: 2px solid #7c3aed; border-radius: 16px; width: 230px; padding: 32px 16px; cursor: pointer; transition: all 0.22s ease-in-out; box-shadow: 0 0 20px rgba(124, 58, 237, 0.25); display: flex; flex-direction: column; align-items: center; position: relative; }
        .lu-card:hover { transform: translateY(-6px); border-color: #a78bfa; box-shadow: 0 0 32px rgba(167, 139, 250, 0.65); background: linear-gradient(135deg, #4c1d95 0%, #2e1065 100%); }
        .lu-icon { font-size: 2.2rem; margin-bottom: 16px; filter: drop-shadow(0 0 8px rgba(255,255,255,0.2)); }
        .lu-card-title { font-size: 1.15rem; font-weight: 700; color: #ffffff; margin-bottom: 8px; letter-spacing: 0.03em; text-transform: uppercase; font-family: Georgia, serif; }
        .lu-card-desc { font-size: 0.78rem; color: #94a3b8; font-family: monospace; margin-bottom: 24px; min-height: 2em; line-height: 1.3; }
        .lu-hotkey { font-size: 0.95rem; color: #fde047; font-weight: bold; font-family: monospace; opacity: 0.85; }

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

        /* Leaderboard Ancient Grid Layout */
        .witch-table { width: 100%; border-collapse: collapse; font-family: 'Georgia', serif; color: #cbd5e1; margin-top: 10px; }
        /* Na-update para maging Sticky ang Header */
        .witch-table th { 
          position: sticky; 
          top: 0; 
          z-index: 10; 
          background: #110624 !important; /* 🔥 Ginawang solid dark imbis na transparent para hindi maghalo ang text kapag nag-scroll */
          color: #ffe6a3; 
          padding: 12px; 
          font-size: 0.8rem; 
          letter-spacing: 0.1em; 
          text-transform: uppercase; 
          border-bottom: 2px solid rgba(197, 160, 89, 0.3); 
          box-shadow: 0 4px 6px rgba(0,0,0,0.5); /* 🔥 Dagdag anino para mukhang naka-angat */
        }
        .witch-table td { padding: 12px; border-bottom: 1px solid rgba(124, 58, 237, 0.15); font-size: 0.88rem; }
        .witch-table tr:hover td { background: rgba(124, 58, 237, 0.1); color: #ffffff; }

    /* 🔥 ITINAMA: Tinanggal ang !important sa loob dahil bawal ito sa keyframes animation! */
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
          margin-bottom: 20px !important; /* 🔥 Ito ang magbibigay ng permanenteng spacing sa itaas ng button */
        }

        /* Tanggalin ang margin-top auto dahil si flex: 1 na sa itaas ang bahalang magtulak pababa */
        .lb-bottom-btn {
          flex-shrink: 0;
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

            <button className="btn wizard-btn" onClick={() => onAction('start-solo', { name: wizardName })}>
              <span className="btn-icon">🧙</span><span className="btn-label">Solo Trial</span>
            </button>
            <button className="btn gold wizard-btn gold-theme" onClick={() => setScreen('coop-menu')}>
              <span className="btn-icon">⚔️</span><span className="btn-label">Co-op Covenant</span>
            </button>
            <button className="btn wizard-btn" onClick={() => setScreen('leaderboard')}>
              <span className="btn-icon">🏆</span><span className="btn-label">Arcane Tombstones</span>
            </button>
            
            <div style={{ display: 'flex', width: '100%', gap: '10px' }}>
              <button 
                className="btn wizard-btn council-btn" 
                style={{ flex: 1, margin: 0 }}
                onClick={() => { setCouncilTab('decrees'); setCouncilNewsOpen(true); }}
              >
                <span className="btn-icon">🏛️</span><span className="btn-label">Council Chronicles</span>
              </button>
            </div>

            {/* 🔮 MYSTIC WITCHCRAFT LINK (AT THE BOTTOM OF THE PANEL) */}
            <div className="mystic-tribute-container">
              <a 
                href="https://ko-fi.com/zidaneee" 
                target="_blank" 
                rel="noopener noreferrer"
                className="mystic-tribute-link"
              >
                ✦ OFFER ARCANE TRIBUTE TO THE ARCHMAGE ✦
              </a>
            </div>

          </div>
        </div>
      )}

      {/* DYNAMIC ARCANE COUNCIL SCROLL OVERLAY WINDOW */}
      {councilNewsOpen && (
        <div className="council-news-overlay" onClick={() => setCouncilNewsOpen(false)}>
          <div className="council-news-box" onClick={e => e.stopPropagation()}>
            <div className="panel-corner pc-tl" />
            <div className="panel-corner pc-tr" />
            <div className="panel-corner pc-bl" />
            <div className="panel-corner pc-br" />

            <div className="section-title" style={{ color: '#ffe6a3', fontSize: '1.25rem', fontFamily: 'Georgia, serif', marginBottom: '14px', textShadow: '0 0 10px rgba(197,160,89,0.5)', textAlign: 'center' }}>
              🏛️ COUNCIL SANCTUM CHRONICLES
            </div>
            
            <div className="council-tab-headers">
              <button className={`council-tab-btn ${councilTab === 'decrees' ? 'active' : ''}`} onClick={() => setCouncilTab('decrees')}>
                📣 Council Decrees
              </button>
              <button className={`council-tab-btn ${councilTab === 'grimoire' ? 'active' : ''}`} onClick={() => setCouncilTab('grimoire')}>
                📜 Grimoire Changes
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
                    <div className="council-log-header">
                      ✨ {item.type === 'decree' ? 'DECREE' : 'GRIMOIRE LOG'} • {new Date(item.created_at).toLocaleDateString()}
                    </div>
                    <div className="council-log-title">{item.title?.toUpperCase()}</div>
                    <div className="council-log-desc">{item.description}</div>
                  </div>
                ))
              )}
            </div>
            
            <button className="btn wizard-btn danger-theme" style={{ marginTop: '14px', width: '100%', margin: '14px 0 0 0' }} onClick={() => setCouncilNewsOpen(false)}>
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
            <button className="btn wizard-btn gold-theme" onClick={() => onAction('host-game', { name: wizardName })}>HOST SANCTUM</button>
            
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
            <button className="btn wizard-btn" onClick={() => onAction('join-game', { name: wizardName, code: joinCode })}>Step Into Sanctum</button>
            <button className="btn wizard-btn danger-theme" style={{ marginTop: '10px' }} onClick={() => setScreen('menu')}>← Leave Sanctum</button>
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

            <div className="section-title" style={{ fontFamily: 'Georgia, serif', color: '#ffe6a3' }}>🏆 COUNCIL OF THE FALLEN</div>
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
              >
                🧙‍♂️ Solo Records
              </button>
              <button 
                className={`council-tab-btn ${leaderboardTab === 'coop' ? 'active' : ''}`} 
                onClick={() => setLeaderboardTab('coop')}
              >
                ⚔️ Co-op Records
              </button>
            </div>

            {/* SCROLL AREA - Malaki na, sagad pababa, at may margin sa ilalim */}
            <div className="lb-scroll-area">
              {loadingLb ? <div className="lb-loading" style={{ padding: '40px', color: '#a78bfa', fontFamily: 'Georgia', textAlign: 'center' }}>Summoning records from ancient scroll…</div> : (
                <table className="witch-table">
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'center', width: '60px' }}>#</th>
                      <th style={{ textAlign: 'center' }}>Wizard</th> {/* 🔥 Naka-center na uli */}
                      <th style={{ textAlign: 'center', width: '90px' }}>Level</th>
                      <th style={{ textAlign: 'center', width: '90px' }}>Wave</th>
                      <th style={{ textAlign: 'right', width: '130px' }}>Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.length === 0 ? (
                      <tr><td colSpan="5" style={{ textAlign: 'center', color: 'rgba(167,139,250,0.5)', padding: '30px' }}>No records yet. Be the first legend!</td></tr>
                    ) : (
                      leaderboard.map((row, idx) => (
                        <tr key={idx} className={idx === 0 ? 'gold-leader' : idx === 1 ? 'silver-leader' : idx === 2 ? 'bronze-leader' : ''}>
                          <td style={{ fontWeight: 'bold', textAlign: 'center' }}>
                            {idx === 0 ? '👑' : (medals[idx] || `#${idx + 1}`)}
                          </td>
                          <td style={{ fontWeight: 600, textAlign: 'center' }}> {/* 🔥 Naka-center na uli */}
                            {row.name || 'Anonymous'}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {row.level || 1}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {row.wave || 1}
                          </td>
                          <td style={{ fontWeight: 'bold', textAlign: 'right' }}>
                            {(row.score || 0).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
            
            {/* LEAVE BUTTON - Swak na sa pinakailalim nang may saktong awang sa kahon */}
            <button className="btn wizard-btn danger-theme lb-bottom-btn" onClick={() => setScreen('menu')}>← Leave Sanctum</button>
          </div>
        </div>
      )}

      {/* LEVEL UP MODAL PANEL LAYER */}
      {screen === 'levelup' && (
        <div className="overlay active" style={{ background: 'rgba(3, 1, 17, 0.55)', backdropFilter: 'blur(3px)' }}>
          <div className="lu-wrapper">
            <div className="lu-title">LEVEL UP — WAVE {hudData?.wave || 1}</div>
            <div className="lu-subtitle">Choose an Upgrade (Press 1, 2, 3 or Click)</div>
            <div className="lu-warning">⚠️ Game continues – enemies are still moving!</div>
            
            <div className="lu-cards-row">
              {displayedChoices.map((opt, i) => {
                const card = getUpgradeMeta(opt);
                return (
                  <div key={i} className="lu-card" style={{ border: '1px solid #c5a059', background: 'linear-gradient(180deg, #1b0c30 0%, #080312 100%)' }} onClick={() => onSelectUpgrade(opt)}>
                    <div className="lu-icon" style={{ textShadow: '0 0 10px rgba(255,255,255,0.4)' }}>{card.icon}</div>
                    <div className="lu-card-title" style={{ color: '#ffe6a3' }}>{card.title}</div>
                    <div className="lu-card-desc" style={{ color: '#cbd5e1' }}>{card.desc}</div>
                    <div className="lu-hotkey">[{i + 1}]</div>
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

            <div className="menu-title" style={{ color: '#ef4444', textShadow: '0 0 15px rgba(239,68,68,0.4)' }}>YOU PERISHED</div>
            <div className="divider mystic-divider" />

            <div id="go-score" style={{ fontSize: '1.45rem', margin: '12px 0', fontFamily: 'Georgia', color: '#ffe6a3', textAlign: 'center' }}>
              Final Score: {(hudData?.score || 0).toLocaleString()}
            </div>
            <div style={{ fontSize: '.88rem', color: '#cbd5e1', marginBottom: '18px', fontFamily: 'monospace', textAlign: 'center' }}>
              Survived to Wave {hudData?.wave || 1}
            </div>
            {isCoop && (
              <div style={{ fontSize: '.85rem', color: '#fca5a5', marginBottom: '10px', fontStyle: 'italic', textAlign: 'center' }}>
                {restartVotes} / 2 voted to restart the game
              </div>
            )}
            {/* {hasSupabase && (
              <div id="go-submit" style={{ marginBottom: '14px', width: '100%' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label className="wizard-field-label" style={{ textAlign: 'center' }}>Record Name on Tombstone</label>
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
                </div>
                <div style={{ fontSize: '.75rem', color: '#a78bfa', marginTop: '6px', minHeight: '1em', fontFamily: 'monospace', textAlign: 'center' }}>{submitStatus}</div>
              </div>
            )} */}

            {hasSupabase && (
              <div id="go-submit" style={{ marginBottom: '14px', width: '100%' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label className="wizard-field-label" style={{ textAlign: 'center' }}>Record Name on Tombstone</label>
                  
                  {/* 🔥 DITO NAGBAGO: Ipakita lang ang input at button kung hindi pa submitted */}
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

            <button className="btn wizard-btn gold-theme" onClick={() => onAction(isCoop ? 'restart-coop' : 'start-solo', { name: wizardName })}>
              🔄 {isCoop ? 'Vote Restart' : 'Play Again'}
            </button>
            <button className="btn wizard-btn" onClick={() => setScreen('menu')}>🏠 Main Menu</button>
          </div>
        </div>
      )}

      {/* MATCH PAUSE OVERLAY */}
      {screen === 'pause' && (
        <div className="overlay active">
          <div className="panel wizard-panel" style={{ width: '320px' }}>
            <div className="panel-corner pc-tl" />
            <div className="panel-corner pc-tr" />
            <div className="panel-corner pc-bl" />
            <div className="panel-corner pc-br" />

            <div className="section-title" style={{ fontFamily: 'Georgia, serif', color: '#ffe6a3' }}>⏸ Paused</div>
            <div className="divider mystic-divider" />
            
            {/* RESUME BUTTON */}
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
            
            {/* EXIT MATCH BUTTON */}
            <button 
              className="btn wizard-btn danger-theme" 
              onClick={() => {
                if (window.executeNetworkExitAction) {
                  window.executeNetworkExitAction();
                } else {
                  setScreen('menu');
                  if (onAction) {
                    try { onAction('exit-match'); } catch(e) {}
                  }
                }
              }}
            >
              Break Covenant
            </button>
          </div>
        </div>
      )}
    </div>
  );
}