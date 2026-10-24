import { useEffect, useRef, useState } from 'react';
import {
  ArrowDownToLine, ArrowRight, Asterisk, Check, ChevronDown,
  CircleHelp, Eye, EyeOff, Layers3, LoaderCircle, LockKeyhole,
  LogOut, Maximize2, PencilLine, RefreshCw, ShieldCheck, Sparkles,
  Upload, WandSparkles, X,
} from 'lucide-react';

const EXAMPLES = [
  { label: 'Fotografia de produto', text: 'Fotografia editorial de um frasco de perfume âmbar sobre uma pedra natural, luz suave do fim da tarde, fundo bege minimalista, composição elegante e detalhes realistas.' },
  { label: 'Um lugar imaginário', text: 'Uma pequena casa de arquitetura brutalista em uma floresta tropical, jardim no telhado, névoa suave e luz da manhã, fotografia arquitetônica cinematográfica.' },
  { label: 'Ilustração criativa', text: 'Uma ilustração de um gato astronauta explorando um jardim lunar com flores gigantes, cores suaves, textura de papel e atmosfera sonhadora.' },
];

const SIZES = [
  { value: '1024x1024', name: 'Quadrado', ratio: '1:1', className: 'square' },
  { value: '1536x1024', name: 'Paisagem', ratio: '3:2', className: 'landscape' },
  { value: '1024x1536', name: 'Retrato', ratio: '2:3', className: 'portrait' },
];

async function request(path, options = {}) {
  const response = await fetch(path, { credentials: 'same-origin', ...options });
  let data = null;
  if (response.status !== 204) {
    try { data = await response.json(); } catch { /* The status below still reports an invalid response. */ }
  }
  if (!response.ok) {
    const error = new Error(data?.error || 'Não foi possível concluir. Tente novamente em instantes.');
    error.status = response.status;
    throw error;
  }
  return data;
}

function Brand({ small = false }) {
  return <span className={`brand ${small ? 'brand-small' : ''}`}><span className="brand-mark"><Asterisk size={27} strokeWidth={1.8} /></span><span>ateliê<span className="brand-dot">.</span></span></span>;
}

function AbstractArt({ compact = false }) {
  return (
    <svg className={`abstract-art ${compact ? 'compact' : ''}`} viewBox="0 0 620 460" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={compact ? 'ribbon-small' : 'ribbon'} x1="170" y1="70" x2="440" y2="365" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E0F5B4" /><stop offset=".27" stopColor="#A9C67B" /><stop offset=".55" stopColor="#425F3C" /><stop offset=".77" stopColor="#B3D493" /><stop offset="1" stopColor="#E0EAC8" />
        </linearGradient>
        <linearGradient id={compact ? 'ribbon-shadow-small' : 'ribbon-shadow'} x1="240" y1="70" x2="370" y2="378" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2C3C27" /><stop offset=".36" stopColor="#7C9B60" /><stop offset=".66" stopColor="#B7D78D" /><stop offset="1" stopColor="#4E6B3C" />
        </linearGradient>
        <radialGradient id={compact ? 'ambient-small' : 'ambient'}><stop stopColor="#AEC78E" stopOpacity=".11" /><stop offset="1" stopColor="#AEC78E" stopOpacity="0" /></radialGradient>
        <filter id={compact ? 'blur-small' : 'blur'}><feGaussianBlur stdDeviation="13" /></filter>
      </defs>
      <ellipse cx="309" cy="236" rx="259" ry="211" fill={`url(#${compact ? 'ambient-small' : 'ambient'})`} />
      <ellipse cx="318" cy="381" rx="108" ry="9" fill="#000" opacity=".38" filter={`url(#${compact ? 'blur-small' : 'blur'})`} />
      <g transform="rotate(-27 310 225)">
        <ellipse cx="310" cy="225" rx="127" ry="147" stroke={`url(#${compact ? 'ribbon-shadow-small' : 'ribbon-shadow'})`} strokeWidth="62" />
        <path d="M310 78C380.14 78 437 143.81 437 225C437 306.19 380.14 372 310 372C239.86 372 183 306.19 183 225" stroke={`url(#${compact ? 'ribbon-small' : 'ribbon'})`} strokeWidth="62" />
        <path d="M310 49C396 49 467 128 467 225" stroke="#EDF4CF" strokeOpacity=".32" strokeWidth="1.2" />
        <path d="M310 342C255 342 213 290 213 225" stroke="#D8ECC0" strokeOpacity=".26" strokeWidth="1.2" />
      </g>
      <path d="M160 110v12m-6-6h12M462 303v9m-4.5-4.5h9" stroke="#B9CDA0" strokeOpacity=".65" strokeWidth="1.5" />
      <circle cx="434" cy="107" r="2" fill="#A8BA92" /><circle cx="161" cy="319" r="1.7" fill="#A8BA92" />
      <path d="M116 231h12M122 225v12" stroke="#8B9C7D" strokeOpacity=".3" />
    </svg>
  );
}

function Header({ authenticated, onLogout, loggingOut, onGuide }) {
  return (
    <header className="site-header">
      <a className="brand-link" href="/" aria-label="Ateliê, início"><Brand /></a>
      <div className="header-middle"><span className="status-dot" /> Seu espaço privado</div>
      <div className="header-actions">
        <button className="guide-button" onClick={onGuide}><CircleHelp size={16} /><span>Guia rápido</span></button>
        {authenticated && <><span className="header-divider" /><button className="logout-button" onClick={onLogout} disabled={loggingOut} aria-label="Sair do estúdio" title="Sair do estúdio">{loggingOut ? <LoaderCircle size={17} className="spin" /> : <LogOut size={17} />}</button></>}
      </div>
    </header>
  );
}

function Guide({ onClose }) {
  const closeRef = useRef(null);
  const dialogRef = useRef(null);
  useEffect(() => {
    const previousFocus = document.activeElement;
    closeRef.current?.focus();
    const handler = event => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'Tab') {
        const elements = [...dialogRef.current.querySelectorAll('button, a, input, [tabindex="0"]')];
        if (!elements.length) return;
        if (event.shiftKey && document.activeElement === elements[0]) { event.preventDefault(); elements.at(-1).focus(); }
        else if (!event.shiftKey && document.activeElement === elements.at(-1)) { event.preventDefault(); elements[0].focus(); }
      }
    };
    document.addEventListener('keydown', handler);
    return () => { document.removeEventListener('keydown', handler); previousFocus?.focus(); };
  }, [onClose]);
  return (
    <div className="modal-backdrop" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="guide-modal" role="dialog" aria-modal="true" aria-labelledby="guide-title" ref={dialogRef}>
        <button className="icon-button modal-close" ref={closeRef} onClick={onClose} aria-label="Fechar guia"><X size={19} /></button>
        <span className="eyebrow">DA IDEIA À IMAGEM</span>
        <h2 id="guide-title">Um pouco de direção.<br />Um mundo de possibilidades.</h2>
        <ol className="guide-steps">
          <li><span>01</span><div><h3>Conte sua ideia</h3><p>Descreva o assunto, o cenário, as cores e o estilo. Quanto mais contexto, melhor a direção.</p></div></li>
          <li><span>02</span><div><h3>Crie ou transforme</h3><p>Gere uma imagem do zero ou envie uma foto e diga o que deseja mudar. Escolha o formato e a qualidade.</p></div></li>
          <li><span>03</span><div><h3>Refine e leve com você</h3><p>Baixe a imagem em PNG ou use o resultado como base para uma nova edição.</p></div></li>
        </ol>
        <div className="guide-note"><ShieldCheck size={19} /><p>O acesso exige sua senha. As descrições e imagens são enviadas à OpenAI para processamento. O histórico fica apenas na memória desta página e é apagado ao sair ou recarregar. Cada geração usa o saldo da API configurada.</p></div>
      </section>
    </div>
  );
}

function ImageLightbox({ image, onClose }) {
  const buttonRef = useRef(null);
  useEffect(() => {
    const previousFocus = document.activeElement;
    buttonRef.current?.focus();
    const handler = event => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'Tab') { event.preventDefault(); buttonRef.current?.focus(); }
    };
    document.addEventListener('keydown', handler);
    return () => { document.removeEventListener('keydown', handler); previousFocus?.focus(); };
  }, [onClose]);
  return <div className="image-lightbox" role="dialog" aria-modal="true" aria-label="Imagem ampliada" onClick={() => onClose()}><button ref={buttonRef} className="icon-button lightbox-close" onClick={onClose} aria-label="Fechar imagem ampliada"><X size={24} /></button><img src={image.dataUrl} alt={image.prompt || 'Imagem criada no Ateliê'} onClick={event => event.stopPropagation()} /></div>;
}

function Login({ session, onLogin, onRetry }) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  async function handleSubmit(event) {
    event.preventDefault();
    if (!password || pending) return;
    setError(''); setPending(true);
    try { await onLogin(password); setPassword(''); }
    catch (err) { setError(err.message); }
    finally { setPending(false); }
  }
  const configured = session?.configured;
  return (
    <main className="login-layout">
      <section className="login-art-panel">
        <span className="eyebrow">IMAGINAÇÃO, SEM LIMITES DE TELA</span>
        <h1>Grandes imagens<br />começam com<br /><em>uma ideia.</em></h1>
        <AbstractArt compact />
        <div className="art-caption"><span className="caption-line" /><span>Seu olhar. Novas possibilidades.</span><Sparkles size={16} /></div>
      </section>
      <section className="login-form-panel">
        <div className="login-content">
          <div className="login-lock"><LockKeyhole size={22} strokeWidth={1.5} /></div>
          {configured ? <>
            <span className="eyebrow">BEM-VINDO AO SEU ESPAÇO</span>
            <h2>Entre. A ideia é sua.</h2>
            <p className="login-description">Um estúdio só seu para criar e transformar<br className="desktop-break" /> imagens com inteligência artificial.</p>
            <form onSubmit={handleSubmit}>
              <label htmlFor="password">Senha de acesso</label>
              <div className="password-input"><input id="password" name="password" type={showPassword ? 'text' : 'password'} value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" placeholder="Sua senha privada" required disabled={pending} autoFocus /><button type="button" aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
              {error && <div className="inline-error login-error" role="alert">{error}</div>}
              <button className="primary-button login-submit" disabled={pending || !password}>{pending ? <><LoaderCircle size={18} className="spin" />Entrando...</> : <>Entrar no estúdio<ArrowRight size={18} /></>}</button>
            </form>
            <div className="login-security"><ShieldCheck size={15} /> Acesso privado. Chave da API protegida no servidor.</div>
          </> : <>
            <span className="eyebrow">QUASE TUDO PRONTO</span>
            <h2>Seu estúdio está chegando.</h2>
            <p className="login-description">Antes de abrir as portas, configure uma senha de acesso e a integração de imagens no ambiente do servidor.</p>
            <div className="setup-requirements"><div><LockKeyhole size={18} /><span><strong>Senha privada</strong><code>SITE_PASSWORD</code></span></div><div><Sparkles size={18} /><span><strong>Chave da OpenAI com saldo</strong><code>IMAGE_API_KEY</code></span></div></div>
            <p className="setup-help">Adicione os valores nas configurações seguras do servidor e reinicie a aplicação. Não compartilhe sua chave no chat.</p>
            <button className="primary-button login-submit" onClick={onRetry}><RefreshCw size={17} />Verificar configuração</button>
          </>}
        </div>
      </section>
    </main>
  );
}

function Studio({ session, onExpired }) {
  const [mode, setMode] = useState('generate');
  const [prompt, setPrompt] = useState('');
  const [size, setSize] = useState('1024x1024');
  const [quality, setQuality] = useState('medium');
  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [images, setImages] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  const fileRef = useRef(null);
  const promptRef = useRef(null);
  const requestRef = useRef(null);
  const selected = images.find(image => image.id === selectedId) || images[0];

  useEffect(() => {
    if (!file) { setFileUrl(null); return; }
    const url = URL.createObjectURL(file); setFileUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => () => requestRef.current?.abort(), []);
  useEffect(() => {
    if (!pending) return;
    setElapsed(0);
    const started = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(id);
  }, [pending]);

  function acceptFile(candidate) {
    setError('');
    if (!candidate) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(candidate.type)) { setError('Envie uma imagem PNG, JPG ou WebP.'); return; }
    if (candidate.size > 20 * 1024 * 1024) { setError('A imagem deve ter até 20 MB.'); return; }
    setFile(candidate); setMode('edit');
    if (fileRef.current) fileRef.current.value = '';
  }

  async function submit(event) {
    event.preventDefault();
    if (pending || !prompt.trim() || !session.generationAvailable) return;
    if (mode === 'edit' && !file) { setError('Escolha uma imagem para editar.'); return; }
    setError(''); setDownloadError(''); setPending(true);
    const controller = new AbortController(); requestRef.current = controller;
    const form = new FormData();
    form.set('mode', mode); form.set('prompt', prompt.trim()); form.set('size', size); form.set('quality', quality);
    if (mode === 'edit') form.set('image', file);
    try {
      const result = await request('/api/images', { method: 'POST', body: form, signal: controller.signal });
      if (!result?.image?.dataUrl) throw new Error('A geração não retornou uma imagem. Tente novamente.');
      setImages(previous => [result.image, ...previous].slice(0, 8)); setSelectedId(result.image.id);
    } catch (err) {
      if (err.name !== 'AbortError') {
        if (err.status === 401) onExpired();
        else setError(err.message);
      }
    } finally {
      setPending(false); requestRef.current = null;
    }
  }

  function cancel() { requestRef.current?.abort(); setError('A espera foi interrompida. Se o processamento já começou, a API ainda pode cobrar pela solicitação.'); }

  async function reuseImage() {
    if (!selected || pending) return;
    setError('');
    try {
      const blob = await (await fetch(selected.dataUrl)).blob();
      setFile(new File([blob], 'criacao-atelie.png', { type: blob.type || 'image/png' }));
      setMode('edit'); setPrompt(''); promptRef.current?.focus();
    } catch { setDownloadError('Não foi possível preparar esta imagem para edição. Baixe o arquivo e envie novamente.'); }
  }

  function download() {
    if (!selected) return;
    const link = document.createElement('a'); link.href = selected.dataUrl; link.download = `atelie-${selected.id}.png`; document.body.append(link); link.click(); link.remove();
  }

  return (
    <main className="studio-main">
      <div className="studio-intro"><div><span className="eyebrow">BOM TER VOCÊ POR AQUI</span><h1>O que vamos criar hoje<span>?</span></h1></div><div className="intro-label"><span className="mini-spark"><Sparkles size={15} /></span> Imaginação em movimento</div></div>
      {!session.generationAvailable && <div className="config-banner" role="status"><LockKeyhole size={17} /><p>Seu estúdio está pronto para explorar. Configure <code>IMAGE_API_KEY</code> no servidor para gerar e editar imagens.</p></div>}
      <div className="studio-grid">
        <section className="controls-panel" aria-label="Configurar criação">
          <div className="controls-heading"><span className="panel-label"><span className="tiny-dot" />SUA DIREÇÃO CRIATIVA</span><span className="step-label">01 — {mode === 'edit' ? '04' : '03'}</span></div>
          <form onSubmit={submit}>
            <div className="mode-switch" role="group" aria-label="Tipo de criação"><button type="button" className={mode === 'generate' ? 'active' : ''} aria-pressed={mode === 'generate'} onClick={() => { setMode('generate'); setError(''); }} disabled={pending}><Sparkles size={16} />Criar imagem</button><button type="button" className={mode === 'edit' ? 'active' : ''} aria-pressed={mode === 'edit'} onClick={() => { setMode('edit'); setError(''); }} disabled={pending}><PencilLine size={16} />Editar imagem</button></div>
            {mode === 'edit' && <div className="upload-section"><label className="field-label" htmlFor="source-image">Sua imagem de referência<span>01</span></label><input ref={fileRef} id="source-image" type="file" accept="image/png,image/jpeg,image/webp" className="visually-hidden" onChange={event => acceptFile(event.target.files?.[0])} disabled={pending} />{fileUrl ? <div className="source-preview"><img src={fileUrl} alt="Imagem original para edição" /><div><strong>{file.name}</strong><span>{(file.size / (1024 * 1024)).toFixed(1)} MB</span><button type="button" className="text-button" disabled={pending} onClick={() => fileRef.current?.click()}>Trocar imagem</button></div><button type="button" className="icon-button source-remove" aria-label="Remover imagem" disabled={pending} onClick={() => setFile(null)}><X size={15} /></button></div> : <button type="button" className={`upload-box ${dragging ? 'dragging' : ''}`} onClick={() => fileRef.current?.click()} onDragOver={event => { event.preventDefault(); if (!pending) setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={event => { event.preventDefault(); setDragging(false); if (!pending) acceptFile(event.dataTransfer.files?.[0]); }} disabled={pending}><span className="upload-icon"><Upload size={20} strokeWidth={1.5} /></span><strong>Solte sua imagem aqui</strong><span>ou clique para escolher</span><small>PNG, JPG ou WebP · até 20 MB</small></button>}</div>}
            <div className="prompt-section"><label className="field-label" htmlFor="prompt">{mode === 'edit' ? 'O que você quer mudar?' : 'Descreva sua ideia'}<span>{mode === 'edit' ? '02' : '01'}</span></label><div className="textarea-wrap"><textarea ref={promptRef} id="prompt" name="prompt" placeholder={mode === 'edit' ? 'Ex.: troque o fundo por um jardim tropical e mantenha a pessoa da foto...' : 'Um lugar que ainda não existe, um produto sob outra luz, uma ideia que só você teve...'} value={prompt} onChange={event => setPrompt(event.target.value)} maxLength={4000} disabled={pending} required /><div className="textarea-footer"><WandSparkles size={13} /><span>Detalhes fazem a diferença</span><span className="character-count">{prompt.length}/4000</span></div></div></div>
            <fieldset className="format-section" disabled={pending}><legend className="field-label">Formato da imagem<span>{mode === 'edit' ? '03' : '02'}</span></legend><div className="format-options">{SIZES.map(item => <label className={`format-option ${size === item.value ? 'selected' : ''}`} key={item.value}><input type="radio" name="size" value={item.value} checked={size === item.value} onChange={() => setSize(item.value)} /><span className={`ratio-icon ${item.className}`} /><strong>{item.name}</strong><small>{item.ratio}</small></label>)}</div></fieldset>
            <div className="quality-section"><label className="field-label" htmlFor="quality">Qualidade<span>{mode === 'edit' ? '04' : '03'}</span></label><div className="select-wrap"><Layers3 size={16} /><select id="quality" value={quality} onChange={event => setQuality(event.target.value)} disabled={pending}><option value="low">Rápida · para explorar ideias</option><option value="medium">Padrão · equilíbrio ideal</option><option value="high">Alta · mais detalhes</option></select><ChevronDown size={15} /></div></div>
            {error && <div className="inline-error" role="alert">{error}</div>}
            <button className="primary-button generate-button" type="submit" disabled={pending || !prompt.trim() || !session.generationAvailable || (mode === 'edit' && !file)}>{pending ? <><LoaderCircle size={18} className="spin" />Dando forma à sua ideia...</> : <><Sparkles size={18} />{mode === 'edit' ? 'Transformar imagem' : 'Gerar imagem'}<ArrowRight size={18} /></>}</button>
            <p className="generation-note">Uma imagem por vez. A criação pode levar alguns minutos.<br />O uso é cobrado no saldo da sua API.</p>
          </form>
        </section>
        <section className="canvas-panel" aria-label="Visualização da criação">
          <div className="canvas-toolbar"><div><span className="canvas-title">Sua criação</span><span className="canvas-subtitle">O próximo passo da sua ideia.</span></div><div className={`canvas-status ${pending ? 'working' : selected ? 'complete' : ''}`}><span className="status-dot" />{pending ? 'Criando' : selected ? 'Concluída' : 'Pronto para criar'}</div></div>
          <div className={`canvas-stage ${selected ? 'has-image' : ''}`}>
            {selected ? <><img className="result-image" src={selected.dataUrl} alt={selected.prompt || 'Imagem criada no Ateliê'} /><button className="expand-button icon-button" onClick={() => setExpanded(true)} aria-label="Ampliar imagem"><Maximize2 size={18} /></button></> : <div className="empty-canvas"><div className="canvas-corner top-left" /><div className="canvas-corner top-right" /><div className="canvas-corner bottom-left" /><div className="canvas-corner bottom-right" /><AbstractArt /><div className="empty-copy"><span className="eyebrow">UM ESPAÇO PARA O INESPERADO</span><h2>Seu próximo projeto<br />começa aqui.</h2><p>Uma descrição é tudo o que você precisa<br />para tirar uma ideia da cabeça.</p></div><span className="canvas-watermark"><Asterisk size={13} /> ESTÚDIO ATELIÊ</span></div>}
            {pending && <div className="generating-overlay" role="status" aria-live="polite"><div className="generating-symbol"><Asterisk size={45} strokeWidth={1.1} /></div><h2>{mode === 'edit' ? 'Transformando sua imagem' : 'Sua ideia está ganhando forma'}</h2><p>Algumas boas ideias precisam de um pouquinho de tempo.</p><span className="elapsed-time" aria-hidden="true">{Math.floor(elapsed / 60).toString().padStart(2, '0')}:{(elapsed % 60).toString().padStart(2, '0')}</span><button className="cancel-button" onClick={cancel}>Interromper espera</button></div>}
          </div>
          {selected ? <div className="result-details"><div className="result-caption"><span className="result-check"><Check size={14} /></span><div><strong>{selected.mode === 'edit' ? 'Uma nova perspectiva.' : 'Da ideia para a tela.'}</strong><span>{selected.size.replace('x', ' × ')} px · PNG</span></div></div><div className="result-actions"><button className="secondary-button" onClick={reuseImage} disabled={pending}><PencilLine size={15} />Editar resultado</button><button className="download-button" onClick={download}><ArrowDownToLine size={16} /><span>Baixar imagem</span></button></div></div> : <div className="canvas-bottom"><LockKeyhole size={13} /><span>Seu espaço. Seu ritmo. Sua criatividade.</span><span className="canvas-bottom-mark">FEITO PARA IMAGINAR</span></div>}
          {downloadError && <div className="inline-error" role="alert">{downloadError}</div>}
          {images.length > 1 && <div className="history-strip" aria-label="Criações desta sessão">{images.map(image => <button key={image.id} className={`history-item ${selected?.id === image.id ? 'selected' : ''}`} onClick={() => { setSelectedId(image.id); setDownloadError(''); }} aria-label={`Ver criação: ${image.prompt.slice(0, 60)}`} aria-pressed={selected?.id === image.id}><img src={image.dataUrl} alt="" /></button>)}<span>Sessão atual<br /><small>Até 8 criações</small></span></div>}
          {!selected && <div className="inspiration-section"><div className="inspiration-heading"><Sparkles size={14} /><span>PRECISA DE UM PONTO DE PARTIDA?</span></div><div className="example-prompts">{EXAMPLES.map((example, index) => <button type="button" key={example.label} onClick={() => { setMode('generate'); setPrompt(example.text); promptRef.current?.focus(); }} disabled={pending}><span className={`example-dot dot-${index}`} /><span>{example.label}</span><ArrowRight size={13} /></button>)}</div></div>}
        </section>
      </div>
      <footer className="studio-footer"><span><Asterisk size={14} /> Feito para as suas ideias.</span><span>ESTÚDIO PRIVADO DE IMAGENS</span><span>Com inteligência artificial<span className="footer-spark">✦</span></span></footer>
      {expanded && selected && <ImageLightbox image={selected} onClose={() => setExpanded(false)} />}
    </main>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [sessionNotice, setSessionNotice] = useState('');

  async function loadSession(signal) {
    setConnectionError(''); setLoading(true);
    try { setSession(await request('/api/session', { signal })); }
    catch (err) { if (err.name !== 'AbortError') setConnectionError('Não conseguimos conectar ao estúdio. Verifique se o servidor está disponível e tente novamente.'); }
    finally { if (!signal?.aborted) setLoading(false); }
  }
  useEffect(() => { const controller = new AbortController(); loadSession(controller.signal); return () => controller.abort(); }, []);
  async function login(password) {
    await request('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
    setSession(await request('/api/session')); setSessionNotice('');
  }
  async function logout() {
    setLoggingOut(true);
    try {
      await request('/api/logout', { method: 'POST' });
      setSession(previous => ({ ...previous, authenticated: false })); setSessionNotice('Você saiu. As criações desta sessão foram apagadas da página.');
    } catch { setSessionNotice('Não foi possível encerrar a sessão. Tente sair novamente.'); }
    finally { setLoggingOut(false); }
  }
  function expired() { setSession(previous => ({ ...previous, authenticated: false })); setSessionNotice('Sua sessão expirou. Entre novamente para continuar.'); }

  return (
    <div className="app-shell">
      <Header authenticated={session?.authenticated} onLogout={logout} loggingOut={loggingOut} onGuide={() => setGuideOpen(true)} />
      {sessionNotice && <div className="session-notice" role="status">{sessionNotice}<button className="icon-button" onClick={() => setSessionNotice('')} aria-label="Fechar aviso"><X size={15} /></button></div>}
      {loading ? <main className="connection-state"><LoaderCircle size={28} className="spin" /><p>Abrindo seu estúdio...</p></main> : connectionError ? <main className="connection-state"><CircleHelp size={30} /><h1>Vamos tentar de novo?</h1><p>{connectionError}</p><button className="primary-button" onClick={() => loadSession()}><RefreshCw size={16} />Reconectar</button></main> : session?.authenticated ? <Studio session={session} onExpired={expired} /> : <Login session={session} onLogin={login} onRetry={() => loadSession()} />}
      {guideOpen && <Guide onClose={() => setGuideOpen(false)} />}
    </div>
  );
}
