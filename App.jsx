import { useState, useEffect, useRef } from 'react'

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const ADMIN_EMAIL   = 'akhmsyarifuddin@gmail.com'
const ADMIN_PASS    = 'Bukakunci01'

const PERMANENT_RUNNER = {
  id: 'runner-permanent-akhmad',
  nama: 'Akhmad Syarifuddin',
  email: 'akhmsyarifuddin@gmail.com',
  password: 'Bukakunci01',
  alamat: '-',
  telepon: '-',
  selfie: '',
  ktp: '',
  kontakDarurat: { nama: '-', telepon: '-' },
  status: 'active',
  permanent: true,
  createdAt: new Date().toISOString(),
}

const DEF_CFG = {
  gajiPokok: 1500000,
  tunjanganMakan: 15000,
  bpjsRate: 2,
  penaltiGagal: 25000,
  homebase: { lat: -6.2088, lng: 106.8456, nama: 'Homebase (belum diset)' },
  tiers: [
    { id: 'A', min: 0,  max: 5,   trip: 15000, unit: 10000, label: '0–5 km' },
    { id: 'B', min: 5,  max: 15,  trip: 30000, unit: 15000, label: '5–15 km' },
    { id: 'C', min: 15, max: 30,  trip: 50000, unit: 20000, label: '15–30 km' },
    { id: 'D', min: 30, max: 999, trip: 75000, unit: 25000, label: '>30 km' },
  ],
}

const MONTHS        = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
const IPHONE_TYPES  = ['5G','5S','6','6S','7','7+','8','8+','X','XS','XR','11','12']
const MEMORI        = ['16GB','32GB','64GB','128GB','256GB']
const WARNA         = ['Silver','Grey','Red','Gold','Rose Gold','Black','Jet Black','Purple','Yellow','Lainnya']
const EX_PRODUK     = ['Inter','iBox']
const SINYAL        = ['All Operator','Bypass Wifi Only','Bypass Cell','Lainnya']
const TOGGLE_OPTS   = ['ON','OFF','N/A']
const KAMERA_OPTS   = ['ON','OFF','Bercak/Jamur']
const KELENGKAPAN   = ['Unit Charger','Unit Charger Box','Unit Box']

// ── UTILS ──────────────────────────────────────────────────────────────────────
const rp  = n => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID')
const tod = () => new Date().toISOString().slice(0, 10)

function haversine(la1, lo1, la2, lo2) {
  const R = 6371, dL = (la2 - la1) * Math.PI / 180, dO = (lo2 - lo1) * Math.PI / 180
  const a = Math.sin(dL/2)**2 + Math.cos(la1*Math.PI/180) * Math.cos(la2*Math.PI/180) * Math.sin(dO/2)**2
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) * 10) / 10
}

function getTier(km, tiers) {
  const k = Number(km) || 0
  return tiers.find(t => k >= t.min && k < t.max) || tiers[tiers.length - 1]
}

function calcTrip(jarak, berhasil, alasan, cfg) {
  const tier = getTier(jarak, cfg.tiers)
  return {
    tierId: tier.id, tierLabel: tier.label,
    insentifTrip: tier.trip,
    insentifUnit: berhasil ? tier.unit : 0,
    penalti: !berhasil && !(alasan || '').trim() ? cfg.penaltiGagal : 0,
  }
}

function calcSalary(rt, cfg) {
  const hA  = new Set(rt.map(t => t.tanggal)).size
  const iT  = rt.reduce((s, t) => s + (t.insentifTrip || 0), 0)
  const iU  = rt.reduce((s, t) => s + (t.insentifUnit || 0), 0)
  const pen = rt.reduce((s, t) => s + (t.penalti || 0), 0)
  const tm  = hA * cfg.tunjanganMakan
  const bpjs = Math.round(cfg.gajiPokok * cfg.bpjsRate / 100)
  return { hariAktif: hA, tunjanganMakan: tm, insentifTrip: iT, insentifUnit: iU, penalti: pen, bpjs, total: cfg.gajiPokok + tm + iT + iU - pen - bpjs }
}

function validatePass(p) {
  if (p.length < 8) return 'Password minimal 8 karakter.'
  if (!/\d/.test(p)) return 'Password harus mengandung minimal 1 angka.'
  return ''
}

async function resizeImg(file, maxW = 360, q = 0.72) {
  return new Promise(res => {
    const r = new FileReader()
    r.onload = e => {
      const img = new Image()
      img.onload = () => {
        const cv = document.createElement('canvas')
        const ratio = Math.min(maxW / img.width, maxW / img.height, 1)
        cv.width = Math.round(img.width * ratio)
        cv.height = Math.round(img.height * ratio)
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height)
        res(cv.toDataURL('image/jpeg', q))
      }
      img.src = e.target.result
    }
    r.readAsDataURL(file)
  })
}

// ── STORAGE (localStorage for production) ─────────────────────────────────────
function sg(key, def) {
  try {
    const v = localStorage.getItem(key)
    return v ? JSON.parse(v) : def
  } catch { return def }
}
function ss(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch {}
}

// ── UI PRIMITIVES ──────────────────────────────────────────────────────────────
const Card = ({ pad = '14px 16px', style = {}, children }) => (
  <div style={{ background: '#fff', border: '0.5px solid #e8e7e2', borderRadius: 12, padding: pad, ...style }}>
    {children}
  </div>
)

const Badge = ({ text, type = 'gray' }) => {
  const m = { green:{bg:'#EAF3DE',c:'#27500A'}, teal:{bg:'#E1F5EE',c:'#0F6E56'}, amber:{bg:'#FAEEDA',c:'#633806'}, red:{bg:'#FCEBEB',c:'#A32D2D'}, blue:{bg:'#E6F1FB',c:'#0C447C'}, purple:{bg:'#EEEDFE',c:'#3C3489'}, gray:{bg:'#f0efea',c:'#888'} }[type] || {bg:'#f0efea',c:'#888'}
  return <span style={{ display:'inline-block', padding:'2px 8px', borderRadius:20, fontSize:11, fontWeight:500, background:m.bg, color:m.c }}>{text}</span>
}

const Lbl = ({ children, req }) => (
  <div style={{ fontSize: 12, fontWeight: 500, color: '#555', marginBottom: 4 }}>
    {children}{req && <span style={{ color: '#A32D2D', marginLeft: 2 }}>*</span>}
  </div>
)

const Inp = ({ style: s = {}, ...p }) => (
  <input {...p} style={{ width:'100%', padding:'9px 10px', borderRadius:6, border:'0.5px solid #ccc', background:'#fff', color:'#2c2c2a', fontSize:13, boxSizing:'border-box', ...s }} />
)

const Sel = ({ children, style: s = {}, ...p }) => (
  <select {...p} style={{ width:'100%', padding:'9px 10px', borderRadius:6, border:'0.5px solid #ccc', background:'#fff', color:'#2c2c2a', fontSize:13, boxSizing:'border-box', ...s }}>
    {children}
  </select>
)

const Btn = ({ children, onClick, primary, danger, ghost, disabled, full, small, style: s = {} }) => {
  const base = { padding: small ? '5px 12px' : '9px 16px', fontSize: small ? 12 : 13, fontWeight: 500, borderRadius: 6, cursor: disabled ? 'not-allowed' : 'pointer', border: 'none', opacity: disabled ? 0.6 : 1, width: full ? '100%' : 'auto' }
  const v = primary ? { background: '#0F6E56', color: '#fff' } : danger ? { background: '#C0392B', color: '#fff' } : ghost ? { background: 'transparent', color: '#0F6E56', border: '1px solid #0F6E56' } : { background: '#f0efea', color: '#2c2c2a' }
  return <button onClick={disabled ? undefined : onClick} style={{ ...base, ...v, ...s }}>{children}</button>
}

const Toast = ({ msg, type = 's' }) => (
  <div className="fi" style={{ background: type === 's' ? '#E1F5EE' : '#FCEBEB', border: `0.5px solid ${type === 's' ? '#1D9E75' : '#E24B4A'}`, borderRadius: 8, padding: '10px 12px', marginBottom: 12, fontSize: 13, color: type === 's' ? '#0F6E56' : '#A32D2D' }}>
    {type === 's' ? '✓ ' : '⚠ '}{msg}
  </div>
)

const Divider = () => <div style={{ height: '0.5px', background: '#eee', margin: '14px 0' }} />

// ── PHOTO INPUT ───────────────────────────────────────────────────────────────
function PhotoInput({ label, capture, value, onChange, req, hint }) {
  const ref = useRef(null)
  return (
    <div>
      <Lbl req={req}>{label}{hint && <span style={{ fontWeight: 400, color: '#aaa', marginLeft: 4 }}>{hint}</span>}</Lbl>
      <div onClick={() => ref.current?.click()} style={{ border: `2px dashed ${value ? '#0F6E56' : '#d0cfc8'}`, borderRadius: 10, padding: 10, textAlign: 'center', cursor: 'pointer', background: value ? '#E1F5EE' : '#fafaf8', minHeight: 84, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 3 }}>
        {value
          ? <div style={{ width: '100%' }}><img src={value} style={{ maxWidth: '100%', maxHeight: 110, borderRadius: 6, objectFit: 'cover' }} /><div style={{ fontSize: 11, color: '#0F6E56', marginTop: 4 }}>✓ Foto tersimpan · Ketuk untuk ganti</div></div>
          : <div><div style={{ fontSize: 26, marginBottom: 3 }}>{capture === 'user' ? '🤳' : '📷'}</div><div style={{ fontSize: 12, color: '#888', fontWeight: 500 }}>{capture === 'user' ? 'Selfie / Upload' : 'Foto / Upload'}</div><div style={{ fontSize: 11, color: '#aaa' }}>Ketuk untuk kamera</div></div>}
      </div>
      <input ref={ref} type="file" accept="image/*" capture={capture} style={{ display: 'none' }} onChange={async e => { if (e.target.files[0]) { const d = await resizeImg(e.target.files[0]); onChange(d) } }} />
    </div>
  )
}

// ── TOGGLE ROW ────────────────────────────────────────────────────────────────
function ToggleRow({ label, options, value, onChange, req }) {
  return (
    <div>
      <Lbl req={req}>{label}</Lbl>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
        {options.map(o => (
          <button key={o} onClick={() => onChange(o)} style={{ padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: value === o ? 500 : 400, cursor: 'pointer', border: `1px solid ${value === o ? '#0F6E56' : '#ddd'}`, background: value === o ? '#E1F5EE' : 'transparent', color: value === o ? '#0F6E56' : '#888' }}>{o}</button>
        ))}
      </div>
    </div>
  )
}

// ── REGISTER ──────────────────────────────────────────────────────────────────
const ER = { nama:'', email:'', password:'', konfirmasi:'', alamat:'', telepon:'', selfie:'', ktp:'', kdNama:'', kdTelepon:'' }

function RegisterPage({ onBack, onRegistered }) {
  const [form, setForm] = useState({ ...ER })
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const v1 = () => {
    if (!form.nama.trim()) return 'Nama wajib diisi.'
    if (!form.email.trim() || !form.email.includes('@')) return 'Email tidak valid.'
    const pe = validatePass(form.password); if (pe) return pe
    if (form.password !== form.konfirmasi) return 'Password tidak cocok.'
    if (!form.alamat.trim()) return 'Alamat wajib diisi.'
    if (!form.telepon.trim()) return 'Nomor telepon wajib diisi.'
    return ''
  }
  const v2 = () => { if (!form.selfie) return 'Foto selfie wajib.'; if (!form.ktp) return 'Foto KTP wajib.'; return '' }
  const v3 = () => { if (!form.kdNama.trim()) return 'Nama kontak darurat wajib.'; if (!form.kdTelepon.trim()) return 'Nomor darurat wajib.'; return '' }

  const next = () => { const e = step === 1 ? v1() : step === 2 ? v2() : ''; if (e) { setErr(e); return }; setErr(''); setStep(s => s + 1) }

  const submit = () => {
    const e = v3(); if (e) { setErr(e); return }; setErr(''); setSaving(true)
    const accs = sg('ds-runner-accounts', [])
    if (accs.find(a => a.email?.toLowerCase() === form.email.toLowerCase())) { setErr('Email ini sudah terdaftar.'); setSaving(false); return }
    const na = { id: `r-${Date.now()}`, nama: form.nama, email: form.email.toLowerCase(), password: form.password, alamat: form.alamat, telepon: form.telepon, selfie: form.selfie, ktp: form.ktp, kontakDarurat: { nama: form.kdNama, telepon: form.kdTelepon }, status: 'active', createdAt: new Date().toISOString() }
    const next = [...accs, na]; ss('ds-runner-accounts', next)
    const names = next.filter(a => a.status === 'active').map(a => a.nama); ss('ds-runners', names)
    setSaving(false); onRegistered(na.nama)
  }

  const steps = [{ n: 1, l: 'Data Diri' }, { n: 2, l: 'Foto' }, { n: 3, l: 'Darurat' }]

  return (
    <div style={{ minHeight: '100vh', background: '#f5f4ef', padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#555' }}>←</button>
          <div><div style={{ fontSize: 16, fontWeight: 500 }}>Daftar sebagai Runner</div><div style={{ fontSize: 12, color: '#888' }}>DeviceStore Sistem Tracking</div></div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
          {steps.map((s, i) => (
            <React.Fragment key={s.n}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 500, background: step >= s.n ? '#0F6E56' : '#ddd', color: step >= s.n ? '#fff' : '#888' }}>{step > s.n ? '✓' : s.n}</div>
                <div style={{ fontSize: 10, color: step >= s.n ? '#0F6E56' : '#888', marginTop: 3 }}>{s.l}</div>
              </div>
              {i < 2 && <div style={{ height: 2, flex: 1, background: step > s.n ? '#0F6E56' : '#ddd', marginBottom: 16 }} />}
            </React.Fragment>
          ))}
        </div>

        {err && <Toast msg={err} type="e" />}

        {step === 1 && (
          <Card className="fi">
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 14, color: '#0F6E56' }}>📋 Data Diri</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              <div><Lbl req>Nama Lengkap</Lbl><Inp placeholder="cth: Budi Santoso" value={form.nama} onChange={e => f('nama', e.target.value)} /></div>
              <div><Lbl req>Email</Lbl><Inp type="email" placeholder="email@contoh.com" value={form.email} onChange={e => f('email', e.target.value)} /></div>
              <div><Lbl req>Password</Lbl><Inp type="password" placeholder="Min. 8 karakter + angka" value={form.password} onChange={e => f('password', e.target.value)} /></div>
              <div><Lbl req>Konfirmasi Password</Lbl><Inp type="password" placeholder="Ulangi password" value={form.konfirmasi} onChange={e => f('konfirmasi', e.target.value)} /></div>
              <div><Lbl req>Alamat</Lbl><Inp placeholder="Alamat lengkap" value={form.alamat} onChange={e => f('alamat', e.target.value)} /></div>
              <div><Lbl req>Nomor Telepon</Lbl><Inp type="tel" placeholder="cth: 08123456789" value={form.telepon} onChange={e => f('telepon', e.target.value)} /></div>
              <Btn primary full onClick={next} style={{ marginTop: 4 }}>Lanjut → Foto</Btn>
            </div>
          </Card>
        )}

        {step === 2 && (
          <Card className="fi">
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4, color: '#0F6E56' }}>📸 Foto Identitas</div>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 14 }}>Digunakan untuk verifikasi identitas runner.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <PhotoInput label="Foto Selfie" capture="user" value={form.selfie} onChange={v => f('selfie', v)} req />
              <PhotoInput label="Foto KTP" capture="environment" value={form.ktp} onChange={v => f('ktp', v)} req />
              <div style={{ display: 'flex', gap: 8 }}>
                <Btn onClick={() => { setErr(''); setStep(1) }} style={{ flex: 1 }}>← Kembali</Btn>
                <Btn primary onClick={next} style={{ flex: 2 }}>Lanjut → Kontak Darurat</Btn>
              </div>
            </div>
          </Card>
        )}

        {step === 3 && (
          <Card className="fi">
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4, color: '#0F6E56' }}>🆘 Kontak Darurat</div>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 14 }}>Dihubungi jika terjadi hal tidak terduga saat COD.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              <div><Lbl req>Nama Kontak Darurat</Lbl><Inp placeholder="cth: Ibu / Ayu" value={form.kdNama} onChange={e => f('kdNama', e.target.value)} /></div>
              <div><Lbl req>No. Telepon Kontak Darurat</Lbl><Inp type="tel" placeholder="cth: 085173441794" value={form.kdTelepon} onChange={e => f('kdTelepon', e.target.value)} /></div>
              <div style={{ background: '#FAEEDA', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#633806' }}>ℹ Dengan mendaftar, data kamu tersimpan dalam sistem DeviceStore dan hanya diakses oleh admin.</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Btn onClick={() => { setErr(''); setStep(2) }} style={{ flex: 1 }}>← Kembali</Btn>
                <Btn primary onClick={submit} disabled={saving} style={{ flex: 2 }}>
                  {saving ? <><span className="spin" />Mendaftarkan...</> : '✓ Daftar Sekarang'}
                </Btn>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

// ── LOGIN ──────────────────────────────────────────────────────────────────────
function Login({ onLogin, onRegister }) {
  const [role,  setRole]  = useState('runner')
  const [email, setEmail] = useState('')
  const [pass,  setPass]  = useState('')
  const [showP, setShowP] = useState(false)
  const [err,   setErr]   = useState('')
  const [logging, setLogging] = useState(false)

  const masuk = () => {
    setErr(''); setLogging(true)
    if (!email.trim() || !pass.trim()) { setErr('Email dan password wajib diisi.'); setLogging(false); return }
    if (role === 'admin') {
      if (email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase() && pass === ADMIN_PASS) { setLogging(false); onLogin('admin', 'Admin'); return }
      setErr('Email atau password admin salah.'); setLogging(false); return
    }
    const accs = sg('ds-runner-accounts', [])
    const acc  = accs.find(a => a.email?.toLowerCase() === email.trim().toLowerCase() && a.status === 'active')
    if (!acc) { setErr('Email runner tidak ditemukan.'); setLogging(false); return }
    if (acc.password !== pass) { setErr('Password salah.'); setLogging(false); return }
    setLogging(false); onLogin('runner', acc.nama)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: '#f5f4ef' }}>
      <div style={{ width: '100%', maxWidth: 340 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ width: 54, height: 54, background: '#0F6E56', borderRadius: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10, fontSize: 28 }}>📱</div>
          <div style={{ fontSize: 21, fontWeight: 500 }}>DeviceStore</div>
          <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>Sistem Tracking Runner</div>
        </div>

        <Card>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
            {['runner', 'admin'].map(r => (
              <button key={r} onClick={() => { setRole(r); setErr('') }} style={{ padding: '10px 0', borderRadius: 8, fontSize: 13, fontWeight: role === r ? 500 : 400, cursor: 'pointer', border: `1.5px solid ${role === r ? '#0F6E56' : '#ddd'}`, background: role === r ? '#E1F5EE' : 'transparent', color: role === r ? '#0F6E56' : '#888' }}>
                {r === 'runner' ? '👤 Runner' : '🔒 Admin'}
              </button>
            ))}
          </div>

          {err && <Toast msg={err} type="e" />}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
            <div><Lbl>Email</Lbl><Inp type="email" placeholder="email@contoh.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && masuk()} /></div>
            <div>
              <Lbl>Password</Lbl>
              <div style={{ position: 'relative' }}>
                <Inp type={showP ? 'text' : 'password'} placeholder="Password akun" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === 'Enter' && masuk()} />
                <button onClick={() => setShowP(!showP)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#888' }}>{showP ? '🙈' : '👁'}</button>
              </div>
            </div>
          </div>

          <Btn primary full onClick={masuk} disabled={logging} style={{ padding: '11px' }}>
            {logging ? <><span className="spin" />Masuk...</> : role === 'runner' ? 'Masuk sebagai Runner →' : 'Masuk sebagai Admin →'}
          </Btn>

          {role === 'runner' && (
            <div>
              <Divider />
              <div style={{ textAlign: 'center', fontSize: 12, color: '#888', marginBottom: 10 }}>Belum punya akun runner?</div>
              <Btn ghost full onClick={onRegister} style={{ fontSize: 12 }}>📝 Daftar sebagai Runner</Btn>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

// ── COD PAGE 1 ────────────────────────────────────────────────────────────────
function CodPage1({ form, setForm, config, onNext }) {
  const [locating, setLocating] = useState(false)
  const [locStep,  setLocStep]  = useState('')
  const [locErr,   setLocErr]   = useState('')
  const [coords,   setCoords]   = useState(form._coords || null)
  const [err,      setErr]      = useState('')
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const hasHB = config.homebase?.lat && config.homebase?.nama !== 'Homebase (belum diset)'

  const ambil = () => {
    if (!navigator.geolocation) { setLocErr('GPS tidak tersedia.'); return }
    setLocating(true); setLocErr(''); setLocStep('gps')
    navigator.geolocation.getCurrentPosition(async pos => {
      const { latitude: la, longitude: lo } = pos.coords
      setCoords({ lat: la, lng: lo }); setForm(p => ({ ...p, _coords: { lat: la, lng: lo } }))
      if (config.homebase?.lat) f('jarak', haversine(la, lo, config.homebase.lat, config.homebase.lng))
      setLocStep('geo')
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${la}&lon=${lo}&accept-language=id`, { headers: { 'User-Agent': 'DeviceStore/1.0' } })
        const d = await res.json(); const a = d.address || {}
        const pts = [a.road, a.suburb || a.neighbourhood, a.city || a.town].filter(Boolean)
        f('lokasi', pts.slice(0, 3).join(', ') || `${la.toFixed(5)},${lo.toFixed(5)}`)
      } catch { f('lokasi', `${la.toFixed(5)}, ${lo.toFixed(5)}`) }
      setLocStep('done'); setLocating(false)
    }, er => {
      setLocErr({ 1: 'Akses lokasi ditolak.', 2: 'Sinyal GPS lemah.', 3: 'Timeout.' }[er.code] || 'GPS gagal.')
      setLocating(false); setLocStep('')
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 })
  }

  const calc = form.jarak ? calcTrip(form.jarak, form.unitBerhasil, form.alasanGagal, config) : null

  const next = () => {
    if (!form.lokasi.trim()) { setErr('Lokasi COD wajib diisi.'); return }
    if (!form.jarak) { setErr('Jarak wajib diisi.'); return }
    if (!form.fotoCOD) { setErr('Foto COD wajib dilampirkan.'); return }
    if (!form.unitBerhasil && !form.alasanGagal.trim()) { setErr('Alasan gagal wajib diisi.'); return }
    setErr(''); onNext()
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#0F6E56', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 500, flexShrink: 0 }}>1</div>
        <div style={{ fontSize: 14, fontWeight: 500 }}>Info Trip COD</div>
        <div style={{ fontSize: 11, color: '#888', marginLeft: 'auto' }}>Halaman 1 / 2</div>
      </div>
      {!hasHB && <div style={{ background: '#FAEEDA', borderRadius: 8, padding: '9px 12px', fontSize: 12, color: '#633806', marginBottom: 10 }}>⚠ Admin belum set homebase — jarak tidak otomatis.</div>}
      {err && <Toast msg={err} type="e" />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div><Lbl req>Tanggal</Lbl><Inp type="date" value={form.tanggal} onChange={e => f('tanggal', e.target.value)} /></div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <Lbl req>Lokasi COD</Lbl>
            <button onClick={ambil} disabled={locating} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, border: 'none', cursor: locating ? 'wait' : 'pointer', background: locating ? '#0F6E56' : '#E1F5EE', color: locating ? '#fff' : '#0F6E56', fontSize: 11, fontWeight: 500 }}>
              {locating ? <span className="spin" /> : '📍 '}
              {locating ? (locStep === 'gps' ? 'GPS...' : 'Alamat...') : 'Ambil Lokasi'}
            </button>
          </div>
          <Inp placeholder="Otomatis atau ketik manual" value={form.lokasi} onChange={e => f('lokasi', e.target.value)} />
          {locErr && <div style={{ fontSize: 11, color: '#A32D2D', marginTop: 3 }}>{locErr}</div>}
        </div>
        {coords && locStep === 'done' && (
          <div style={{ borderRadius: 8, overflow: 'hidden', border: '0.5px solid #ddd', position: 'relative' }}>
            <iframe src={`https://www.openstreetmap.org/export/embed.html?bbox=${coords.lng-.005},${coords.lat-.005},${coords.lng+.005},${coords.lat+.005}&layer=mapnik&marker=${coords.lat},${coords.lng}`} className="map-frame" title="Peta lokasi" />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.5)', padding: '4px 8px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 10, color: '#fff' }}>📍 Lokasi terkini</span>
              <a href={`https://www.google.com/maps?q=${coords.lat},${coords.lng}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: '#9FE1CB', textDecoration: 'none' }}>Buka Maps ↗</a>
            </div>
          </div>
        )}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <Lbl req>Jarak dari Homebase (km)</Lbl>
            <span style={{ fontSize: 10, background: '#E6F1FB', color: '#0C447C', padding: '2px 7px', borderRadius: 10 }}>📡 Jarak real via Google Maps setelah deploy</span>
          </div>
          <Inp type="number" min="0" step="0.1" placeholder="Otomatis (GPS) atau isi manual" value={form.jarak} onChange={e => f('jarak', e.target.value)} />
        </div>
        <PhotoInput label="Foto COD" capture="environment" value={form.fotoCOD} onChange={v => f('fotoCOD', v)} req hint="(foto saat COD berlangsung)" />
        <div>
          <Lbl req>Unit berhasil dibawa?</Lbl>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[{ v: true, l: '✓ Berhasil' }, { v: false, l: '✗ Gagal' }].map(o => (
              <button key={String(o.v)} onClick={() => setForm(p => ({ ...p, unitBerhasil: o.v, alasanGagal: '' }))} style={{ padding: '10px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500, border: 'none', background: form.unitBerhasil === o.v ? (o.v ? '#E1F5EE' : '#FCEBEB') : '#f0efea', color: form.unitBerhasil === o.v ? (o.v ? '#0F6E56' : '#A32D2D') : '#888' }}>{o.l}</button>
            ))}
          </div>
        </div>
        {!form.unitBerhasil && <div><Lbl req>Alasan Gagal</Lbl><Inp placeholder="cth: Pemilik tidak ada di rumah" value={form.alasanGagal} onChange={e => f('alasanGagal', e.target.value)} /></div>}
        {calc && (
          <div style={{ background: '#f5f4ef', borderRadius: 8, padding: '12px', fontSize: 12 }}>
            <div style={{ fontWeight: 500, color: '#666', marginBottom: 8 }}>Estimasi insentif</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
              <span style={{ color: '#888' }}>Tier</span><Badge text={`Tier ${calc.tierId} · ${calc.tierLabel}`} type="teal" />
              <span style={{ color: '#888' }}>Insentif trip</span><span style={{ fontWeight: 500, color: '#0F6E56' }}>{rp(calc.insentifTrip)}</span>
              {calc.insentifUnit > 0 && <><span style={{ color: '#888' }}>Insentif unit</span><span style={{ color: '#0F6E56', fontWeight: 500 }}>{rp(calc.insentifUnit)}</span></>}
              {calc.penalti > 0 && <><span style={{ color: '#888' }}>Penalti</span><span style={{ color: '#A32D2D', fontWeight: 500 }}>-{rp(calc.penalti)}</span></>}
              <span style={{ color: '#888', borderTop: '0.5px solid #ddd', paddingTop: 5 }}>Total</span>
              <span style={{ fontWeight: 600, borderTop: '0.5px solid #ddd', paddingTop: 5, color: '#0F6E56' }}>{rp(calc.insentifTrip + calc.insentifUnit - calc.penalti)}</span>
            </div>
          </div>
        )}
        <Btn primary full onClick={next} style={{ padding: '12px' }}>{form.unitBerhasil ? 'Lanjut → Detail Unit ›' : 'Simpan Trip Gagal ›'}</Btn>
      </div>
    </div>
  )
}

// ── COD PAGE 2 ────────────────────────────────────────────────────────────────
const DEF_UNIT = { tipeIphone:'', memori:'', warna:'', warnaLain:'', exProduk:'', sinyal:'', sinyalLain:'', fingerPrint:'', trueTone:'', faceId:'', kameraDepan:'', kameraBelakang:'', batteryHealth:'', kelengkapan:'', minus:'' }

function CodPage2({ unit, setUnit, onBack, onSubmit, saving }) {
  const u  = unit
  const su = (k, v) => setUnit(p => ({ ...p, [k]: v }))
  const [err, setErr] = useState('')
  const required = ['tipeIphone','memori','warna','exProduk','sinyal','fingerPrint','trueTone','faceId','kameraDepan','kameraBelakang','batteryHealth','kelengkapan']

  const submit = () => {
    for (const k of required) { if (!u[k]) { setErr(`Field "${k}" wajib diisi.`); return } }
    if (u.warna === 'Lainnya' && !u.warnaLain.trim()) { setErr('Tuliskan warna lainnya.'); return }
    if (u.sinyal === 'Lainnya' && !u.sinyalLain.trim()) { setErr('Tuliskan kondisi sinyal lainnya.'); return }
    setErr(''); onSubmit()
  }

  const Row = ({ lbl, k, opts }) => (
    <div><Lbl req>{lbl}</Lbl><Sel value={u[k] || ''} onChange={e => su(k, e.target.value)}><option value="">-- Pilih --</option>{opts.map(o => <option key={o} value={o}>{o}</option>)}</Sel></div>
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#0F6E56', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 500, flexShrink: 0 }}>2</div>
        <div style={{ fontSize: 14, fontWeight: 500 }}>Detail Unit Hasil COD</div>
        <div style={{ fontSize: 11, color: '#888', marginLeft: 'auto' }}>Halaman 2 / 2</div>
      </div>
      <div style={{ background: '#E1F5EE', borderRadius: 8, padding: '9px 12px', fontSize: 12, color: '#0F6E56', marginBottom: 12 }}>📱 Semua field wajib diisi sesuai kondisi unit.</div>
      {err && <Toast msg={err} type="e" />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Row lbl="Tipe iPhone" k="tipeIphone" opts={IPHONE_TYPES} />
        <Row lbl="Memori Internal" k="memori" opts={MEMORI} />
        <div>
          <Lbl req>Warna</Lbl>
          <Sel value={u.warna || ''} onChange={e => su('warna', e.target.value)}><option value="">-- Pilih Warna --</option>{WARNA.map(o => <option key={o} value={o}>{o}</option>)}</Sel>
          {u.warna === 'Lainnya' && <Inp style={{ marginTop: 6 }} placeholder="Tulis warna lainnya..." value={u.warnaLain || ''} onChange={e => su('warnaLain', e.target.value)} />}
        </div>
        <Row lbl="Ex Produk" k="exProduk" opts={EX_PRODUK} />
        <div>
          <Lbl req>Sinyal</Lbl>
          <Sel value={u.sinyal || ''} onChange={e => su('sinyal', e.target.value)}><option value="">-- Pilih Sinyal --</option>{SINYAL.map(o => <option key={o} value={o}>{o}</option>)}</Sel>
          {u.sinyal === 'Lainnya' && <Inp style={{ marginTop: 6 }} placeholder="Tulis kondisi sinyal..." value={u.sinyalLain || ''} onChange={e => su('sinyalLain', e.target.value)} />}
        </div>
        <ToggleRow label="Finger Print" options={TOGGLE_OPTS} value={u.fingerPrint} onChange={v => su('fingerPrint', v)} req />
        <ToggleRow label="True Tone" options={TOGGLE_OPTS} value={u.trueTone} onChange={v => su('trueTone', v)} req />
        <ToggleRow label="Face ID" options={TOGGLE_OPTS} value={u.faceId} onChange={v => su('faceId', v)} req />
        <ToggleRow label="Kamera Depan" options={KAMERA_OPTS} value={u.kameraDepan} onChange={v => su('kameraDepan', v)} req />
        <ToggleRow label="Kamera Belakang" options={KAMERA_OPTS} value={u.kameraBelakang} onChange={v => su('kameraBelakang', v)} req />
        <div>
          <Lbl req>Battery Health (%)</Lbl>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Inp type="number" min="0" max="100" placeholder="cth: 85" value={u.batteryHealth || ''} onChange={e => su('batteryHealth', e.target.value)} style={{ maxWidth: 120 }} />
            <span style={{ fontSize: 13, color: '#888' }}>%</span>
          </div>
        </div>
        <Row lbl="Kelengkapan" k="kelengkapan" opts={KELENGKAPAN} />
        <div>
          <Lbl>Minus / Catatan Lain</Lbl>
          <textarea value={u.minus || ''} onChange={e => su('minus', e.target.value)} placeholder="cth: Baret halus di belakang, tombol volume agak keras..." rows={3} style={{ width: '100%', padding: '9px 10px', borderRadius: 6, border: '0.5px solid #ccc', fontSize: 13, boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }} />
        </div>
        <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
          <Btn onClick={onBack} style={{ flex: 1 }}>← Kembali</Btn>
          <Btn primary onClick={submit} disabled={saving} style={{ flex: 2, padding: '12px' }}>
            {saving ? <><span className="spin" />Menyimpan...</> : '✓ Simpan Trip & Unit'}
          </Btn>
        </div>
      </div>
    </div>
  )
}

// ── RUNNER INPUT FORM ─────────────────────────────────────────────────────────
function RunnerInputForm({ name, config, onAdd }) {
  const [page,   setPage]   = useState(1)
  const [done,   setDone]   = useState(false)
  const [saving, setSaving] = useState(false)
  const [form,   setForm]   = useState({ tanggal: tod(), lokasi: '', jarak: '', unitBerhasil: true, alasanGagal: '', fotoCOD: '', _coords: null })
  const [unit,   setUnit]   = useState({ ...DEF_UNIT })

  const handleNext = () => { if (form.unitBerhasil) setPage(2); else submit() }
  const submit = () => {
    setSaving(true)
    const calc = calcTrip(form.jarak, form.unitBerhasil, form.alasanGagal, config)
    onAdd({ ...form, coords: form._coords, unit: form.unitBerhasil ? unit : null, ...calc, runner: name })
    setForm({ tanggal: tod(), lokasi: '', jarak: '', unitBerhasil: true, alasanGagal: '', fotoCOD: '', _coords: null })
    setUnit({ ...DEF_UNIT }); setPage(1); setSaving(false); setDone(true); setTimeout(() => setDone(false), 2500)
  }

  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Input Trip COD</div>
      {done && <Toast msg="Trip berhasil disimpan!" />}
      <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
        {[{ n: 1, l: 'Info Trip' }, { n: 2, l: 'Detail Unit' }].map((s, i) => (
          <React.Fragment key={s.n}>
            <div style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 500, background: page === s.n ? '#0F6E56' : page > s.n ? '#E1F5EE' : '#f0efea', color: page === s.n ? '#fff' : page > s.n ? '#0F6E56' : '#aaa' }}>{s.n}. {s.l}</div>
            {i < 1 && <div style={{ width: 16, height: 1.5, background: '#ddd', alignSelf: 'center' }} />}
          </React.Fragment>
        ))}
      </div>
      {page === 1 && <CodPage1 form={form} setForm={setForm} config={config} onNext={handleNext} />}
      {page === 2 && <CodPage2 unit={unit} setUnit={setUnit} onBack={() => setPage(1)} onSubmit={submit} saving={saving} />}
    </div>
  )
}

// ── RUNNER HISTORY ────────────────────────────────────────────────────────────
function RunnerHistory({ trips }) {
  const [sel, setSel] = useState(null)
  const sorted = [...trips].sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || ''))
  const t = sel ? trips.find(x => x.id === sel) : null

  if (t) return (
    <div>
      <button onClick={() => setSel(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0F6E56', fontSize: 13, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 4 }}>← Kembali ke riwayat</button>
      <Card style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontWeight: 500 }}>{t.lokasi}</div>
          <Badge text={t.unitBerhasil ? 'Berhasil' : 'Gagal'} type={t.unitBerhasil ? 'green' : 'red'} />
        </div>
        <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>{t.tanggal} · {t.jarak} km · Tier {t.tierId}</div>
        <div style={{ fontWeight: 500, color: '#0F6E56', fontSize: 13, marginBottom: 10 }}>{rp((t.insentifTrip || 0) + (t.insentifUnit || 0) - (t.penalti || 0))}</div>
        {t.fotoCOD && <div style={{ marginBottom: 10 }}><div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Foto COD:</div><img src={t.fotoCOD} style={{ width: '100%', maxHeight: 180, borderRadius: 8, objectFit: 'cover' }} /></div>}
        {t.coords && <a href={`https://www.google.com/maps?q=${t.coords.lat},${t.coords.lng}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#0F6E56', textDecoration: 'none' }}>📍 Lihat Lokasi di Maps ↗</a>}
      </Card>
      {t.unit && (
        <Card>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>Detail Unit iPhone</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
            {[['Tipe','tipeIphone'],['Memori','memori'],['Warna','warna'],['Ex Produk','exProduk'],['Sinyal','sinyal'],['Finger Print','fingerPrint'],['True Tone','trueTone'],['Face ID','faceId'],['Kamera Depan','kameraDepan'],['Kamera Belakang','kameraBelakang'],['Battery Health','batteryHealth'],['Kelengkapan','kelengkapan']].map(([l, k]) => (
              <React.Fragment key={k}><div style={{ color: '#888' }}>{l}</div><div style={{ fontWeight: 500 }}>{t.unit[k]}{k === 'batteryHealth' ? '%' : ''}</div></React.Fragment>
            ))}
          </div>
          {t.unit.minus && <div style={{ marginTop: 8, paddingTop: 8, borderTop: '0.5px solid #eee', fontSize: 12 }}>Catatan: {t.unit.minus}</div>}
        </Card>
      )}
    </div>
  )

  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 14 }}>Riwayat Trip</div>
      {sorted.length === 0
        ? <div style={{ color: '#888', fontSize: 13, textAlign: 'center', padding: '2rem 0' }}>Belum ada trip.</div>
        : sorted.map(t => (
          <Card key={t.id} style={{ marginBottom: 8, cursor: 'pointer' }} onClick={() => setSel(t.id)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{t.lokasi}</div>
              <Badge text={t.unitBerhasil ? 'Berhasil' : 'Gagal'} type={t.unitBerhasil ? 'green' : 'red'} />
            </div>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>{t.tanggal} · {t.jarak} km · <Badge text={`T.${t.tierId}`} type="teal" /></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#0F6E56' }}>{rp((t.insentifTrip || 0) + (t.insentifUnit || 0) - (t.penalti || 0))}</div>
              <div style={{ fontSize: 11, color: '#aaa' }}>Ketuk untuk detail ›</div>
            </div>
          </Card>
        ))
      }
    </div>
  )
}

// ── RUNNER APP ────────────────────────────────────────────────────────────────
function RunnerApp({ name, config, trips, onAdd, onLogout }) {
  const [view, setView] = useState('input')
  const mt = trips.filter(t => t.runner === name && t.tanggal?.startsWith(tod().slice(0, 7)))
  const earnings = mt.reduce((s, t) => s + (t.insentifTrip || 0) + (t.insentifUnit || 0) - (t.penalti || 0), 0)

  return (
    <div style={{ maxWidth: 420, margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f5f4ef' }}>
      <div style={{ background: '#0F6E56', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Runner</div>
          <div style={{ fontSize: 15, fontWeight: 500, color: '#fff' }}>{name}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Insentif bulan ini</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>{rp(earnings)}</div>
          </div>
          <button onClick={onLogout} style={{ padding: '5px 10px', borderRadius: 6, background: '#C0392B', border: 'none', color: '#fff', fontSize: 11, fontWeight: 500, cursor: 'pointer' }}>Keluar</button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', background: '#085041' }}>
        {[{ v: mt.length, l: 'Trip' }, { v: trips.filter(t => t.runner === name && t.tanggal === tod()).length, l: 'Hari ini' }, { v: mt.filter(t => t.unitBerhasil).length, l: 'Berhasil' }].map((s, i) => (
          <div key={s.l} style={{ padding: '10px 4px', textAlign: 'center', borderRight: i < 2 ? '0.5px solid rgba(255,255,255,0.12)' : undefined }}>
            <div style={{ fontSize: 20, fontWeight: 500, color: '#fff' }}>{s.v}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)' }}>{s.l}</div>
          </div>
        ))}
      </div>
      <div style={{ flex: 1, padding: '14px', overflowY: 'auto' }}>
        {view === 'input' && <RunnerInputForm name={name} config={config} onAdd={onAdd} />}
        {view === 'hist' && <RunnerHistory trips={trips.filter(t => t.runner === name)} />}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '0.5px solid #ddd', background: '#fff' }}>
        {[{ id: 'input', icon: '📝', l: 'Input COD' }, { id: 'hist', icon: '📋', l: 'Riwayat' }].map(n => (
          <button key={n.id} onClick={() => setView(n.id)} style={{ padding: '10px', border: 'none', background: 'transparent', cursor: 'pointer', borderTop: `2px solid ${view === n.id ? '#0F6E56' : 'transparent'}`, color: view === n.id ? '#0F6E56' : '#888' }}>
            <div style={{ fontSize: 20 }}>{n.icon}</div>
            <div style={{ fontSize: 11, fontWeight: view === n.id ? 500 : 400 }}>{n.l}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── ADMIN COMPONENTS ──────────────────────────────────────────────────────────
function AdminDashboard({ trips, stock, runners, config, accounts }) {
  const thisMonth = tod().slice(0, 7)
  const mt = trips.filter(t => t.tanggal?.startsWith(thisMonth))
  const totalGaji = runners.reduce((s, r) => {
    const g = calcSalary(mt.filter(t => t.runner === r), config)
    return s + config.gajiPokok + g.tunjanganMakan + g.insentifTrip + g.insentifUnit - g.penalti
  }, 0)

  return (
    <div>
      <div style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>{MONTHS[new Date().getMonth()]} {new Date().getFullYear()}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 10, marginBottom: 20 }}>
        {[{ v: mt.length, l: 'Total Trip', c: '#0F6E56' }, { v: mt.filter(t => t.unitBerhasil).length, l: 'Unit Berhasil', c: '#534AB7' }, { v: (stock || []).filter(s => s.status === 'AVAILABLE').length, l: 'Stok Tersedia', c: '#185FA5' }, { v: accounts.filter(a => a.status === 'active').length, l: 'Runner Aktif', c: '#BA7517' }].map(m => (
          <div key={m.l} style={{ background: '#f0efea', borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 3 }}>{m.l}</div>
            <div style={{ fontSize: 22, fontWeight: 500, color: m.c }}>{m.v}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>Performa runner bulan ini</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 8, marginBottom: 20 }}>
        {runners.map(r => {
          const rt = mt.filter(t => t.runner === r)
          const ac = accounts.find(a => a.nama === r)
          return (
            <Card key={r} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {ac?.selfie ? <img src={ac.selfie} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} /> : <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#E1F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>👤</div>}
              <div><div style={{ fontWeight: 500, fontSize: 12 }}>{r}</div><div style={{ fontSize: 11, color: '#888' }}>{rt.length} trip · {rt.filter(t => t.unitBerhasil).length} unit</div><div style={{ fontSize: 11, color: '#0F6E56', fontWeight: 500 }}>{rp(rt.reduce((s, t) => s + (t.insentifTrip || 0) + (t.insentifUnit || 0), 0))}</div></div>
            </Card>
          )
        })}
      </div>
      <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>5 trip terbaru</div>
      <Card pad="0" style={{ overflow: 'hidden' }}>
        {trips.length === 0
          ? <div style={{ padding: '16px', fontSize: 13, color: '#888', textAlign: 'center' }}>Belum ada data trip.</div>
          : <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 500 }}>
                <thead style={{ background: '#f5f4ef' }}><tr>{['Tgl','Runner','Lokasi','Tier','Status','Insentif'].map(h => <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 500, color: '#888', whiteSpace: 'nowrap' }}>{h}</th>)}</tr></thead>
                <tbody>{trips.slice(0, 5).map(t => (
                  <tr key={t.id} style={{ borderTop: '0.5px solid #eee' }}>
                    <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>{t.tanggal}</td>
                    <td style={{ padding: '8px 10px' }}>{t.runner}</td>
                    <td style={{ padding: '8px 10px', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.lokasi}</td>
                    <td style={{ padding: '8px 10px' }}><Badge text={`T.${t.tierId}`} type="teal" /></td>
                    <td style={{ padding: '8px 10px' }}><Badge text={t.unitBerhasil ? 'Berhasil' : 'Gagal'} type={t.unitBerhasil ? 'green' : 'red'} /></td>
                    <td style={{ padding: '8px 10px', fontWeight: 500, color: '#0F6E56' }}>{rp((t.insentifTrip || 0) + (t.insentifUnit || 0) - (t.penalti || 0))}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>}
      </Card>
    </div>
  )
}

function AdminTrips({ trips, runners }) {
  const [fR, setFR] = useState('all'); const [fM, setFM] = useState(tod().slice(0, 7)); const [sel, setSel] = useState(null)
  const filtered = trips.filter(t => (fR === 'all' || t.runner === fR) && (!fM || t.tanggal?.startsWith(fM)))
  const t = sel ? trips.find(x => x.id === sel) : null

  if (t) return (
    <div className="fi">
      <button onClick={() => setSel(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0F6E56', fontSize: 13, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 4 }}>← Kembali</button>
      <Card style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><div style={{ fontWeight: 500, fontSize: 14 }}>{t.lokasi}</div><Badge text={t.unitBerhasil ? 'Berhasil' : 'Gagal'} type={t.unitBerhasil ? 'green' : 'red'} /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12, marginBottom: 10 }}>
          {[['Tanggal',t.tanggal],['Runner',t.runner],['Jarak',`${t.jarak} km`],['Tier',`Tier ${t.tierId}`],['Insentif Trip',rp(t.insentifTrip)],['Insentif Unit',rp(t.insentifUnit)],['Penalti',t.penalti>0?`-${rp(t.penalti)}`:'-']].map(([l,v]) => (
            <React.Fragment key={l}><div style={{ color: '#888' }}>{l}</div><div style={{ fontWeight: 500 }}>{v}</div></React.Fragment>
          ))}
        </div>
        {t.fotoCOD && <div style={{ marginBottom: 10 }}><div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Foto COD:</div><img src={t.fotoCOD} style={{ width: '100%', maxHeight: 200, borderRadius: 8, objectFit: 'cover' }} /></div>}
        {t.coords && <a href={`https://www.google.com/maps?q=${t.coords.lat},${t.coords.lng}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#0F6E56', textDecoration: 'none' }}>📍 Lihat Lokasi di Maps ↗</a>}
      </Card>
      {t.unit && <Card><div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>Detail Unit iPhone</div><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>{[['Tipe','tipeIphone'],['Memori','memori'],['Warna','warna'],['Ex Produk','exProduk'],['Sinyal','sinyal'],['Finger Print','fingerPrint'],['True Tone','trueTone'],['Face ID','faceId'],['Kamera Depan','kameraDepan'],['Kamera Belakang','kameraBelakang'],['Battery Health','batteryHealth'],['Kelengkapan','kelengkapan']].map(([l,k])=><React.Fragment key={k}><div style={{color:'#888'}}>{l}</div><div style={{fontWeight:500}}>{t.unit[k]}{k==='batteryHealth'?'%':''}</div></React.Fragment>)}</div>{t.unit.minus&&<div style={{marginTop:8,paddingTop:8,borderTop:'0.5px solid #eee',fontSize:12}}>Catatan: {t.unit.minus}</div>}</Card>}
    </div>
  )

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        <div><Lbl>Runner</Lbl><Sel value={fR} onChange={e => setFR(e.target.value)}><option value="all">Semua</option>{runners.map(r => <option key={r} value={r}>{r}</option>)}</Sel></div>
        <div><Lbl>Bulan</Lbl><Inp type="month" value={fM} onChange={e => setFM(e.target.value)} /></div>
      </div>
      <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>{filtered.length} trip</div>
      <Card pad="0" style={{ overflow: 'hidden' }}>
        {filtered.length === 0 ? <div style={{ padding: '16px', fontSize: 13, color: '#888', textAlign: 'center' }}>Tidak ada data.</div> :
          <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 600 }}>
            <thead style={{ background: '#f5f4ef' }}><tr>{['Tgl','Runner','Lokasi','Jarak','Tier','Status','Insentif','Detail'].map(h => <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 500, color: '#888', whiteSpace: 'nowrap' }}>{h}</th>)}</tr></thead>
            <tbody>{filtered.map(t => <tr key={t.id} style={{ borderTop: '0.5px solid #eee' }}>
              <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>{t.tanggal}</td><td style={{ padding: '8px 10px' }}>{t.runner}</td>
              <td style={{ padding: '8px 10px', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.lokasi}</td>
              <td style={{ padding: '8px 10px' }}>{t.jarak} km</td>
              <td style={{ padding: '8px 10px' }}><Badge text={`T.${t.tierId}`} type="teal" /></td>
              <td style={{ padding: '8px 10px' }}><Badge text={t.unitBerhasil ? 'Berhasil' : 'Gagal'} type={t.unitBerhasil ? 'green' : 'red'} /></td>
              <td style={{ padding: '8px 10px', color: '#0F6E56', fontWeight: 500 }}>{rp((t.insentifTrip||0)+(t.insentifUnit||0)-(t.penalti||0))}</td>
              <td style={{ padding: '8px 10px' }}><button onClick={() => setSel(t.id)} style={{ fontSize: 11, color: '#0F6E56', background: 'none', border: 'none', cursor: 'pointer' }}>Lihat ›</button></td>
            </tr>)}</tbody>
          </table></div>}
      </Card>
    </div>
  )
}

function AdminSalary({ trips, runners, config }) {
  const now = new Date(); const [mon, setMon] = useState(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`)
  const mt = trips.filter(t => t.tanggal?.startsWith(mon))
  const tots = runners.map(r => ({ r, g: calcSalary(mt.filter(t => t.runner === r), config) }))
  const grand = tots.reduce((s, { g }) => s + g.total, 0)
  return (
    <div>
      <div style={{ marginBottom: 14 }}><Lbl>Bulan</Lbl><Inp type="month" value={mon} onChange={e => setMon(e.target.value)} style={{ maxWidth: 200 }} /></div>
      <Card pad="0" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 680 }}>
            <thead style={{ background: '#f5f4ef' }}><tr>{['Runner','Hari','Gaji','Tunjangan','I.Trip','I.Unit','Penalti','BPJS','Total'].map(h => <th key={h} style={{ padding: '8px 10px', textAlign: h === 'Runner' ? 'left' : 'right', fontWeight: 500, color: '#888', whiteSpace: 'nowrap' }}>{h}</th>)}</tr></thead>
            <tbody>
              {tots.map(({ r, g }) => <tr key={r} style={{ borderTop: '0.5px solid #eee' }}>
                <td style={{ padding: '8px 10px', fontWeight: 500 }}>{r}</td>
                <td style={{ padding: '8px 10px', textAlign: 'right' }}>{g.hariAktif}h</td>
                <td style={{ padding: '8px 10px', textAlign: 'right' }}>{rp(config.gajiPokok)}</td>
                <td style={{ padding: '8px 10px', textAlign: 'right' }}>{rp(g.tunjanganMakan)}</td>
                <td style={{ padding: '8px 10px', textAlign: 'right', color: '#0F6E56' }}>{rp(g.insentifTrip)}</td>
                <td style={{ padding: '8px 10px', textAlign: 'right', color: '#0F6E56' }}>{rp(g.insentifUnit)}</td>
                <td style={{ padding: '8px 10px', textAlign: 'right', color: '#A32D2D' }}>{g.penalti > 0 ? `-${rp(g.penalti)}` : '-'}</td>
                <td style={{ padding: '8px 10px', textAlign: 'right', color: '#A32D2D' }}>-{rp(g.bpjs)}</td>
                <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 500, color: '#0F6E56' }}>{rp(g.total)}</td>
              </tr>)}
              <tr style={{ borderTop: '1.5px solid #ccc', background: '#f5f4ef' }}>
                <td colSpan={8} style={{ padding: '8px 10px', fontWeight: 500 }}>Total pengeluaran gaji</td>
                <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 500, color: '#0F6E56' }}>{rp(grand)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

function AdminRunners({ accounts, onUpdateStatus }) {
  const [sel, setSel] = useState(null)
  const acc = sel ? accounts.find(a => a.id === sel) : null

  if (acc) return (
    <div className="fi">
      <button onClick={() => setSel(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0F6E56', fontSize: 13, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 4 }}>← Kembali</button>
      <Card style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          {acc.selfie ? <img src={acc.selfie} style={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover', border: '2px solid #E1F5EE' }} /> : <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#E1F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>👤</div>}
          <div><div style={{ fontSize: 16, fontWeight: 500 }}>{acc.nama}</div><div style={{ fontSize: 12, color: '#888' }}>{acc.email}</div><div style={{ marginTop: 4, display: 'flex', gap: 6 }}><Badge text={acc.status === 'active' ? 'Aktif' : 'Nonaktif'} type={acc.status === 'active' ? 'green' : 'red'} />{acc.permanent && <Badge text="Permanen" type="blue" />}</div></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12, marginBottom: 12 }}>
          {[['Alamat',acc.alamat],['Telepon',acc.telepon],['Kontak Darurat',acc.kontakDarurat?.nama],['No. Darurat',acc.kontakDarurat?.telepon],['Terdaftar',acc.createdAt?new Date(acc.createdAt).toLocaleDateString('id-ID'):'—']].map(([l,v])=>(
            <React.Fragment key={l}><div style={{color:'#888'}}>{l}</div><div>{v||'—'}</div></React.Fragment>
          ))}
        </div>
        {!acc.permanent && <Btn primary={acc.status!=='active'} danger={acc.status==='active'} onClick={()=>{onUpdateStatus(acc.id,acc.status==='active'?'inactive':'active');setSel(null);}} small>{acc.status==='active'?'🚫 Nonaktifkan':'✓ Aktifkan Kembali'}</Btn>}
      </Card>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {[['Foto Selfie',acc.selfie],['Foto KTP',acc.ktp]].map(([l,s])=>(
          <div key={l}><div style={{fontSize:12,fontWeight:500,color:'#555',marginBottom:6}}>{l}</div>{s?<img src={s} style={{width:'100%',borderRadius:8,objectFit:'cover',maxHeight:170,border:'0.5px solid #eee'}}/>:<div style={{height:110,background:'#f0efea',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,color:'#aaa'}}>Tidak ada foto</div>}</div>
        ))}
      </div>
    </div>
  )

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>{accounts.length} runner terdaftar</div>
      {accounts.length === 0
        ? <Card><div style={{ fontSize: 13, color: '#888', textAlign: 'center', padding: '1rem' }}>Belum ada runner terdaftar.</div></Card>
        : accounts.map(a => (
          <Card key={a.id} style={{ marginBottom: 8, cursor: 'pointer' }} onClick={() => setSel(a.id)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {a.selfie ? <img src={a.selfie} style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid #E1F5EE' }} /> : <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#E1F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>👤</div>}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}><div style={{ fontWeight: 500, fontSize: 13 }}>{a.nama}</div><div style={{ display: 'flex', gap: 4 }}><Badge text={a.status === 'active' ? 'Aktif' : 'Nonaktif'} type={a.status === 'active' ? 'green' : 'red'} />{a.permanent && <Badge text="Permanen" type="blue" />}</div></div>
                <div style={{ fontSize: 12, color: '#888' }}>{a.email}</div>
              </div>
              <div style={{ color: '#ccc', fontSize: 18 }}>›</div>
            </div>
          </Card>
        ))
      }
    </div>
  )
}

function AdminSettings({ config, runners, onSaveConfig, onSaveRunners }) {
  const [cfg, setCfg] = useState({ ...config, homebase: { ...config.homebase }, tiers: config.tiers.map(t => ({ ...t })) })
  const [rList, setRList] = useState([...runners]); const [newR, setNewR] = useState(''); const [saved, setSaved] = useState(false); const [sHB, setSHB] = useState(false); const [hbErr, setHbErr] = useState('')
  const save = () => { onSaveConfig(cfg); onSaveRunners(rList); setSaved(true); setTimeout(() => setSaved(false), 2500) }
  const upT = (i, k, v) => { const t = cfg.tiers.map((x, idx) => idx === i ? { ...x, [k]: Number(v) } : x); setCfg({ ...cfg, tiers: t }) }
  const upHB = (k, v) => setCfg(c => ({ ...c, homebase: { ...c.homebase, [k]: v } }))
  const useLoc = () => {
    if (!navigator.geolocation) { setHbErr('GPS tidak tersedia.'); return }
    setSHB(true); setHbErr('')
    navigator.geolocation.getCurrentPosition(async pos => {
      const { latitude: la, longitude: lo } = pos.coords
      try { const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${la}&lon=${lo}&accept-language=id`); const d = await r.json(); const a = d.address || {}; setCfg(c => ({ ...c, homebase: { lat: la, lng: lo, nama: [a.road, a.suburb||a.neighbourhood, a.city||a.town].filter(Boolean).slice(0,2).join(', ')||'Homebase' } })) }
      catch { setCfg(c => ({ ...c, homebase: { ...c.homebase, lat: la, lng: lo } })) }
      setSHB(false)
    }, () => { setHbErr('GPS ditolak.'); setSHB(false) })
  }

  return (
    <div>
      {saved && <div style={{ background: '#E1F5EE', borderRadius: 8, padding: '10px', marginBottom: 12, fontSize: 13, color: '#0F6E56' }}>✓ Tersimpan!</div>}
      <Card style={{ marginBottom: 14, borderLeft: '3px solid #0F6E56' }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>📍 Lokasi Homebase</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div><Lbl>Latitude</Lbl><Inp type="number" step="0.00001" value={cfg.homebase?.lat||''} onChange={e=>upHB('lat',Number(e.target.value))} /></div>
          <div><Lbl>Longitude</Lbl><Inp type="number" step="0.00001" value={cfg.homebase?.lng||''} onChange={e=>upHB('lng',Number(e.target.value))} /></div>
        </div>
        <div style={{ marginBottom: 10 }}><Lbl>Nama Homebase</Lbl><Inp value={cfg.homebase?.nama||''} onChange={e=>upHB('nama',e.target.value)} /></div>
        <button onClick={useLoc} disabled={sHB} style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 12px', borderRadius:6, border:'none', cursor:sHB?'wait':'pointer', background:sHB?'#0F6E56':'#E1F5EE', color:sHB?'#fff':'#0F6E56', fontSize:12, fontWeight:500 }}>{sHB?<span className="spin"/>:'📍 '}{sHB?'Mengambil...':'Gunakan Lokasi Saya'}</button>
        {hbErr && <div style={{fontSize:11,color:'#A32D2D',marginTop:4}}>{hbErr}</div>}
        <div style={{marginTop:10,background:'#E6F1FB',borderRadius:6,padding:'8px 10px',fontSize:11,color:'#0C447C'}}>ℹ Setelah deploy, tambahkan Google Maps Distance Matrix API untuk jarak real.</div>
      </Card>
      <Card style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Komponen Gaji</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(155px,1fr))', gap: 10 }}>
          {[['Gaji Pokok','gajiPokok'],['Tunjangan Makan/hari','tunjanganMakan'],['BPJS %','bpjsRate'],['Penalti Gagal','penaltiGagal']].map(([l,k])=>(
            <div key={k}><Lbl>{l}</Lbl><Inp type="number" value={cfg[k]} onChange={e=>setCfg({...cfg,[k]:Number(e.target.value)})} /></div>
          ))}
        </div>
      </Card>
      <Card style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Tier Insentif</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead style={{ background: '#f5f4ef' }}><tr>{['Tier','Min km','Max km','Trip','Unit'].map(h=><th key={h} style={{padding:'8px 10px',textAlign:'left',fontWeight:500,color:'#888'}}>{h}</th>)}</tr></thead>
            <tbody>{cfg.tiers.map((t,i)=><tr key={t.id} style={{borderTop:'0.5px solid #eee'}}>
              <td style={{padding:'8px 10px'}}><Badge text={`Tier ${t.id}`} type="teal"/></td>
              {['min','max','trip','unit'].map(k=><td key={k} style={{padding:'6px 10px'}}><Inp type="number" value={t[k]} onChange={e=>upT(i,k,e.target.value)} style={{padding:'5px 7px',fontSize:12}}/></td>)}
            </tr>)}</tbody>
          </table>
        </div>
      </Card>
      <Card style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Daftar Runner</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
          {rList.map(r=><div key={r} style={{display:'flex',alignItems:'center',gap:6,background:'#f0efea',padding:'4px 8px 4px 12px',borderRadius:20,fontSize:12}}>{r}<button onClick={()=>setRList(rList.filter(x=>x!==r))} style={{background:'none',border:'none',cursor:'pointer',color:'#A32D2D',fontSize:16,lineHeight:1}}>×</button></div>)}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Inp placeholder="Nama runner baru" value={newR} onChange={e=>setNewR(e.target.value)} style={{maxWidth:200}}/>
          <Btn primary small onClick={()=>{if(newR.trim()&&!rList.includes(newR.trim())){setRList([...rList,newR.trim()]);setNewR('')}}}>Tambah</Btn>
        </div>
      </Card>
      <Btn primary onClick={save} style={{ padding: '10px 28px' }}>💾 Simpan Semua</Btn>
    </div>
  )
}

const ATABS = [{ id:'dashboard',i:'📊',l:'Dashboard' },{ id:'trips',i:'📍',l:'Trip' },{ id:'salary',i:'💰',l:'Gaji' },{ id:'runners',i:'👥',l:'Runner' },{ id:'settings',i:'⚙️',l:'Setting' }]

function AdminApp({ config, runners, trips, stock, accounts, onUpdateRunnerStatus, onSaveConfig, onSaveRunners, onLogout }) {
  const [view, setView] = useState('dashboard')
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div style={{ background: '#0F6E56', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 15, fontWeight: 500, color: '#fff' }}>📱 DeviceStore Admin</div>
        <button onClick={onLogout} style={{ padding: '5px 12px', borderRadius: 6, background: '#C0392B', border: 'none', color: '#fff', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>Keluar</button>
      </div>
      <div style={{ display: 'flex', gap: 2, padding: '8px 12px', background: '#f5f4ef', borderBottom: '0.5px solid #ddd', overflowX: 'auto' }}>
        {ATABS.map(n => <button key={n.id} onClick={() => setView(n.id)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: 12, background: view === n.id ? '#fff' : 'transparent', fontWeight: view === n.id ? 500 : 400, color: view === n.id ? '#0F6E56' : '#888' }}>{n.i} {n.l}</button>)}
      </div>
      <div style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
        {view === 'dashboard' && <AdminDashboard trips={trips} stock={stock} runners={runners} config={config} accounts={accounts} />}
        {view === 'trips'     && <AdminTrips     trips={trips} runners={runners} />}
        {view === 'salary'    && <AdminSalary    trips={trips} runners={runners} config={config} />}
        {view === 'runners'   && <AdminRunners   accounts={accounts} onUpdateStatus={onUpdateRunnerStatus} />}
        {view === 'settings'  && <AdminSettings  config={config} runners={runners} onSaveConfig={onSaveConfig} onSaveRunners={onSaveRunners} />}
      </div>
    </div>
  )
}

// ── ROOT ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [screen,   setScreen]   = useState('login')
  const [user,     setUser]     = useState(null)
  const [config,   setConfig]   = useState(() => sg('ds-config', DEF_CFG))
  const [runners,  setRunners]  = useState([])
  const [trips,    setTrips]    = useState(() => sg('ds-trips', []))
  const [stock,    setStock]    = useState(() => sg('ds-stock', []))
  const [accounts, setAccounts] = useState([])
  const [regOk,    setRegOk]    = useState('')

  useEffect(() => {
    let accs = sg('ds-runner-accounts', [])
    // Ensure permanent runner always exists
    if (!accs.find(a => a.id === PERMANENT_RUNNER.id)) {
      accs = [PERMANENT_RUNNER, ...accs]
      ss('ds-runner-accounts', accs)
    }
    // Update permanent runner data if needed (password/email sync)
    accs = accs.map(a => a.id === PERMANENT_RUNNER.id ? { ...a, email: PERMANENT_RUNNER.email, password: PERMANENT_RUNNER.password, permanent: true } : a)
    ss('ds-runner-accounts', accs)
    const names = accs.filter(a => a.status === 'active').map(a => a.nama)
    ss('ds-runners', names)
    setAccounts(accs); setRunners(names)
  }, [])

  const syncRunners = (accs) => {
    const names = accs.filter(a => a.status === 'active').map(a => a.nama)
    setRunners(names); ss('ds-runners', names)
  }

  const addTrip = (form) => {
    const calc = calcTrip(form.jarak, form.unitBerhasil, form.alasanGagal, config)
    const next = [{ ...form, ...calc, id: Date.now() }, ...trips]
    setTrips(next); ss('ds-trips', next)
  }

  const updateRunnerStatus = (id, status) => {
    const next = accounts.map(x => x.id === id ? { ...x, status } : x)
    setAccounts(next); ss('ds-runner-accounts', next); syncRunners(next)
  }

  const saveConfig = (cfg) => { setConfig(cfg); ss('ds-config', cfg) }
  const saveRunners = (r) => { setRunners(r); ss('ds-runners', r) }

  if (screen === 'register') return (
    <RegisterPage
      onBack={() => setScreen('login')}
      onRegistered={nama => {
        const accs = sg('ds-runner-accounts', [])
        setAccounts(accs); syncRunners(accs); setRegOk(nama); setScreen('login')
      }}
    />
  )

  if (screen === 'login') return (
    <div>
      {regOk && <div style={{ padding: '10px 16px', background: '#E1F5EE', fontSize: 13, color: '#0F6E56', textAlign: 'center', borderBottom: '0.5px solid #9FE1CB' }}>✓ Pendaftaran {regOk} berhasil! Silakan masuk.</div>}
      <Login
        onLogin={(role, name) => { setUser({ role, name }); setScreen('app'); setRegOk('') }}
        onRegister={() => setScreen('register')}
      />
    </div>
  )

  if (!user) return null

  if (user.role === 'runner') return (
    <RunnerApp name={user.name} config={config} trips={trips} onAdd={addTrip} onLogout={() => { setUser(null); setScreen('login') }} />
  )

  return (
    <AdminApp
      config={config} runners={runners} trips={trips} stock={stock} accounts={accounts}
      onUpdateRunnerStatus={updateRunnerStatus}
      onSaveConfig={saveConfig} onSaveRunners={saveRunners}
      onLogout={() => { setUser(null); setScreen('login') }}
    />
  )
}
