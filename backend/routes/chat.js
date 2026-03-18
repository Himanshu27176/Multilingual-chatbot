'use strict';

var express = require('express');
var fetch   = require('node-fetch');
var db      = require('../db');
var auth    = require('../middleware/auth');
var router  = express.Router();

var GROQ_URL   = 'https://api.groq.com/openai/v1/chat/completions';
var GROQ_MODEL = 'llama-3.3-70b-versatile';
var GROQ_VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct'; // Groq vision model

var LANG_NAMES = {
  en:'English', hi:'Hindi', mr:'Marathi', es:'Spanish',
  fr:'French',  de:'German', zh:'Chinese', ar:'Arabic',
  ja:'Japanese', pt:'Portuguese', ru:'Russian', bn:'Bengali',
  ur:'Urdu', ta:'Tamil', te:'Telugu', ko:'Korean'
};

// ── TEXT CHAT ─────────────────────────────────────────────────
router.post('/message', auth, async function(req, res) {
  try {
    var message  = req.body.message;
    var language = req.body.language || 'en';
    var session_id = req.body.session_id;
    var userId   = req.user.id;

    if (!message || !message.trim())
      return res.status(400).json({ error: 'Message cannot be empty.' });

    var sessionId = session_id;
    if (!sessionId) {
      var result = await db.execute(
        'INSERT INTO chat_sessions (user_id, title, language) VALUES (?,?,?)',
        [userId, message.slice(0,60)||'New Chat', language]
      );
      sessionId = result[0].insertId;
    }

    var historyResult = await db.execute(
      'SELECT role, content FROM messages WHERE session_id=? ORDER BY created_at ASC LIMIT 20',
      [sessionId]
    );
    var history = historyResult[0];

    await db.execute(
      'INSERT INTO messages (session_id, role, content, language) VALUES (?,?,?,?)',
      [sessionId, 'user', message, language]
    );

    var langName   = LANG_NAMES[language] || 'English';
    var systemPrompt = 'You are LingoGO, an expert multilingual AI assistant. ALWAYS respond in '+langName+' ONLY. Be helpful, friendly, and culturally aware. Keep responses concise but thorough.';

    var apiMessages = [{ role:'system', content:systemPrompt }];
    history.forEach(function(m) {
      apiMessages.push({ role: m.role==='assistant'?'assistant':'user', content: m.content });
    });
    apiMessages.push({ role:'user', content:message });

    var apiRes = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'Authorization':'Bearer '+process.env.GROQ_API_KEY },
      body: JSON.stringify({ model:GROQ_MODEL, messages:apiMessages, max_tokens:1024, temperature:0.7 })
    });

    if (!apiRes.ok) {
      var err = await apiRes.json();
      return res.status(502).json({ error:'AI service error: '+(err.error&&err.error.message||'Check your Groq API key.') });
    }

    var data     = await apiRes.json();
    var botReply = 'Sorry, I could not generate a response.';
    if (data.choices&&data.choices[0]&&data.choices[0].message)
      botReply = data.choices[0].message.content;

    await db.execute(
      'INSERT INTO messages (session_id, role, content, language) VALUES (?,?,?,?)',
      [sessionId, 'assistant', botReply, language]
    );

    res.json({ reply:botReply, session_id:sessionId });
  } catch(err) {
    console.error('Chat error:', err);
    res.status(500).json({ error:'Server error. Please try again.' });
  }
});

// ── IMAGE ANALYSIS ────────────────────────────────────────────
router.post('/image', auth, async function(req, res) {
  try {
    var message    = req.body.message || 'Analyze this image.';
    var language   = req.body.language || 'en';
    var session_id = req.body.session_id;
    var imageBase64 = req.body.image;
    var mimeType    = req.body.mime_type || 'image/jpeg';
    var userId     = req.user.id;

    if (!imageBase64)
      return res.status(400).json({ error: 'Image data is required.' });

    // Validate base64 size (~5MB limit)
    if (imageBase64.length > 7 * 1024 * 1024)
      return res.status(400).json({ error: 'Image too large. Please use a smaller image.' });

    var sessionId = session_id;
    if (!sessionId) {
      var result = await db.execute(
        'INSERT INTO chat_sessions (user_id, title, language) VALUES (?,?,?)',
        [userId, '📷 '+message.slice(0,50), language]
      );
      sessionId = result[0].insertId;
    }

    // Save user message with image indicator
    await db.execute(
      'INSERT INTO messages (session_id, role, content, language) VALUES (?,?,?,?)',
      [sessionId, 'user', '[IMAGE] '+message, language]
    );

    var langName = LANG_NAMES[language] || 'English';

    var systemPrompt =
      'You are LingoGO, an expert multilingual AI assistant with vision capabilities. ' +
      'When analyzing images: ' +
      '1. DETECT any text in the image and identify its language. ' +
      '2. TRANSLATE any detected text into '+langName+'. ' +
      '3. DESCRIBE what you see in the image (objects, scene, context). ' +
      '4. ANSWER any question the user has about the image. ' +
      'ALWAYS respond in '+langName+' ONLY. Be thorough but concise.';

    var apiMessages = [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: 'data:'+mimeType+';base64,'+imageBase64
            }
          },
          {
            type: 'text',
            text: message
          }
        ]
      }
    ];

    var apiRes = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': 'Bearer '+process.env.GROQ_API_KEY
      },
      body: JSON.stringify({
        model:       GROQ_VISION_MODEL,
        messages:    apiMessages,
        max_tokens:  1024,
        temperature: 0.5
      })
    });

    if (!apiRes.ok) {
      var errData = await apiRes.json();
      console.error('Groq vision error:', JSON.stringify(errData));
      return res.status(502).json({
        error: 'Vision AI error: '+(errData.error&&errData.error.message||'Could not analyze image.')
      });
    }

    var data     = await apiRes.json();
    var botReply = 'Sorry, I could not analyze this image.';
    if (data.choices&&data.choices[0]&&data.choices[0].message)
      botReply = data.choices[0].message.content;

    await db.execute(
      'INSERT INTO messages (session_id, role, content, language) VALUES (?,?,?,?)',
      [sessionId, 'assistant', botReply, language]
    );

    res.json({ reply:botReply, session_id:sessionId });

  } catch(err) {
    console.error('Image analysis error:', err);
    res.status(500).json({ error:'Image analysis failed. Please try again.' });
  }
});

// ── SESSIONS ─────────────────────────────────────────────────
router.get('/sessions', auth, async function(req, res) {
  try {
    var result = await db.execute(
      'SELECT * FROM chat_sessions WHERE user_id=? ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );
    res.json(result[0]);
  } catch(err) { res.status(500).json({ error:'Server error.' }); }
});

router.get('/messages/:sessionId', auth, async function(req, res) {
  try {
    var sessResult = await db.execute(
      'SELECT id FROM chat_sessions WHERE id=? AND user_id=?',
      [req.params.sessionId, req.user.id]
    );
    if (!sessResult[0].length) return res.status(403).json({ error:'Access denied.' });
    var msgResult = await db.execute(
      'SELECT * FROM messages WHERE session_id=? ORDER BY created_at ASC',
      [req.params.sessionId]
    );
    res.json(msgResult[0]);
  } catch(err) { res.status(500).json({ error:'Server error.' }); }
});

router.delete('/sessions/:sessionId', auth, async function(req, res) {
  try {
    await db.execute(
      'DELETE FROM chat_sessions WHERE id=? AND user_id=?',
      [req.params.sessionId, req.user.id]
    );
    res.json({ message:'Deleted.' });
  } catch(err) { res.status(500).json({ error:'Server error.' }); }
});

// ── TRANSLATE ─────────────────────────────────────────────────
router.post('/translate', auth, async function(req, res) {
  try {
    var text=req.body.text; var target_language=req.body.target_language;
    if (!text||!target_language) return res.status(400).json({ error:'text and target_language required.' });
    var langName=LANG_NAMES[target_language]||target_language;
    var apiRes=await fetch(GROQ_URL,{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+process.env.GROQ_API_KEY},
      body:JSON.stringify({ model:GROQ_MODEL, messages:[
        {role:'system',content:'You are a professional translator. Return ONLY the translated text, nothing else.'},
        {role:'user',content:'Translate to '+langName+':\n\n'+text}
      ], max_tokens:512 })
    });
    var data=await apiRes.json();
    var translation=text;
    if (data.choices&&data.choices[0]&&data.choices[0].message) translation=data.choices[0].message.content;
    res.json({ translation:translation });
  } catch(err) { res.status(500).json({ error:'Translation failed.' }); }
});

module.exports = router;