// ASTORIA Night Club POS System — SaaS MVP (Keep existing tabs + add Payroll / Settings)
(function(){
  'use strict';
  const { useState, useMemo, useEffect } = React;
  const e = React.createElement;

  // =============================
  // Utils
  // =============================
  const jpy = (n)=>`¥${(n||0).toLocaleString()}`;
  const clamp = (n,min,max)=>Math.max(min,Math.min(max,n));
  const todayKey = () => new Date().toISOString().slice(0,10).replaceAll('-','');

  // Rounding helpers
  function roundToUnit(value, unit, method){
    if(!unit || unit<=1) return Math[method||'round'](value);
    const v = value / unit;
    const m = method==='ceil'?'ceil':method==='floor'?'floor':'round';
    return Math[m](v)*unit;
  }

  // Ticket id helper
  const nextTicketId = (existing) => {
    const today = todayKey();
    const seq = (existing||[])
      .map(t=>t.id)
      .filter(id=>typeof id==='string' && id.startsWith(`T-${today}-`))
      .map(id=>parseInt(id.split('-')[2],10))
      .reduce((a,b)=>Math.max(a,b),0)+1;
    return `T-${today}-${String(seq).padStart(3,'0')}`;
  };

  // =============================
  // IndexedDB (very small wrapper)
  // =============================
  const DB_NAME = 'astoria-pos';
  const DB_VERSION = 2;
  const STORES = ['settings','menu','tickets','guests','staff','shifts','payrollRules'];

  function openDB(){
    return new Promise((resolve,reject)=>{
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (ev)=>{
        const db = ev.target.result;
        STORES.forEach(name=>{
          if(!db.objectStoreNames.contains(name)){
            db.createObjectStore(name,{keyPath:'id'});
          }
        });
      };
      req.onsuccess = ()=>resolve(req.result);
      req.onerror = ()=>reject(req.error);
    });
  }
  async function idbGetAll(store){
    const db = await openDB();
    return new Promise((res,rej)=>{
      const tx = db.transaction(store,'readonly');
      const s = tx.objectStore(store);
      const rq = s.getAll();
      rq.onsuccess = ()=>res(rq.result||[]);
      rq.onerror  = ()=>rej(rq.error);
    });
  }
  async function idbPut(store, obj){
    const db = await openDB();
    return new Promise((res,rej)=>{
      const tx = db.transaction(store,'readwrite');
      const s  = tx.objectStore(store);
      const rq = s.put(obj);
      rq.onsuccess = ()=>res(true);
      rq.onerror   = ()=>rej(rq.error);
    });
  }

  // =============================
  // Settings (with defaults)
  // =============================
  const DefaultSettings = {
    id: 'local',
    serviceFeeRate: 0.20,                // サービス料 20%（設定で変更可）
    taxRate: 0.10,                       // 消費税 10%
    rounding: { level:'ticket', method:'round', unit:100 }, // 伝票単位・四捨五入・100円
    closing: { dailyCutoffHour:5, monthly:'eom' },          // 日次=翌5時、月末締め
    payments: ['現金','カード','月末請求'],
    timeRounding: { unitMinutes:5, checkIn:'ceil', checkOut:'floor' },
    payroll: { nightPremium:false, closing:'eom', payday:15 }, // 深夜割増OFF、支払日=15日
    backRules: { nomination:null, accompany:null, bottlePercent:null }
  };
  async function loadInitialSettings(){
    const rows = await idbGetAll('settings');
    if(rows && rows.length) return rows[0];
    try {
      const resp = await fetch('settings.local.json',{cache:'no-store'});
      const s = await resp.json();
      const merged = { ...DefaultSettings, ...s, id:'local' };
      await idbPut('settings', merged);
      return merged;
    } catch(_) {
      await idbPut('settings', DefaultSettings);
      return DefaultSettings;
    }
  }

  // =============================
  // Pricing Engine
  // =============================
  /** line: { id, name, price, qty, flags:{ serviceable, taxable } } */
  function calcTicket(lines, settings){
    const taxRate = settings.taxRate ?? 0.10;
    const srvRate = settings.serviceFeeRate ?? 0.20;
    const round   = settings.rounding || { level:'ticket', method:'round', unit:100 };
    const qty = (n)=> (typeof n==='number' && !isNaN(n)? n: 1);

    // 小計
    const subtotal = (lines||[]).reduce((sum,l)=> sum + (l.price||0)*qty(l.qty), 0);

    // サービス料対象（フラグtrue）
    const srvBase = (lines||[])
      .filter(l=>l.flags?.serviceable!==false)
      .reduce((sum,l)=> sum + (l.price||0)*qty(l.qty), 0);
    const serviceFee = Math.round(srvBase * srvRate);

    // 税対象（フラグtrue）+ サービス料（税対象）
    const taxBase = (lines||[])
      .filter(l=>l.flags?.taxable!==false)
      .reduce((sum,l)=> sum + (l.price||0)*qty(l.qty), 0) + serviceFee;
    const tax = Math.floor(taxBase * taxRate); // 1円未満切捨て慣行

    let total = subtotal + serviceFee + tax;

    // 端数（伝票単位）
    if(round.level==='ticket'){
      total = roundToUnit(total, round.unit||1, round.method||'round');
    }
    return { subtotal, serviceFee, tax, total };
  }

  // =============================
  // CSV helpers
  // =============================
  function toCSV(rows){
    if(!rows.length) return '';
    const esc = (s)=>`"${String(s??'').replaceAll('"','""')}"`;
    const header = Object.keys(rows[0]);
    const body = rows.map(r=> header.map(k=>esc(r[k])).join(','));
    return [header.join(','), ...body].join('\n');
  }
  function download(filename, text){
    const a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([text],{type:'text/csv'}));
    a.download=filename; a.click(); URL.revokeObjectURL(a.href);
  }

  // =============================
  // App (既存タブを維持しつつ、payroll/settingsを追加)
  // =============================
  function App(){
    const color = useMemo(()=>({
      bg:"bg-[#12090c]", panel:"bg-[#1b0f12]", gold:"#C6A35E", line:"border-white/10"
    }),[]);

    // 設定
    const [settings,setSettings] = useState(DefaultSettings);
    useEffect(()=>{ loadInitialSettings().then(setSettings); },[]);
    useEffect(()=>{ idbPut('settings', {...settings, id:'local'}); },[settings]);

    // 🔴 既存タブを踏襲：'sales'（会計）と 'attendance'（勤怠）は残す
    // 🆕 追加タブ：'payroll'（給与管理）、'settings'（各種設定）
    const [activeTab, setActiveTab] = useState('sales'); // 'sales' | 'attendance' | 'payroll' | 'settings'

    // 画面
    return e('div',{className:`min-h-screen ${color.bg}`},
      e('div',{className:"max-w-7xl mx-auto p-6"},
        // タブバー（既存2 + 追加2）
        e('div',{className:'flex gap-2 mb-4'},
          [
            {key:'sales',      label:'会計'},
            {key:'attendance', label:'勤怠'},
            {key:'payroll',    label:'給与管理'},   // 追加
            {key:'settings',   label:'各種設定'}    // 追加
          ].map(tab =>
            e('button',{
              key:tab.key,
              onClick:()=>setActiveTab(tab.key),
              className:`px-4 py-2 rounded-lg border ${activeTab===tab.key? 'bg-white/10 border-white/20':'border-white/10 hover:bg-white/5'}`
            }, tab.label)
          )
        ),

        // タブ内容（既存タブは残し、新規2タブを追加）
        activeTab==='sales'      && e(SalesPOS,      {settings,setSettings,color}),
        activeTab==='attendance' && e(AttendanceTab, {settings,color}),
        activeTab==='payroll'    && e(PayrollTab,    {settings,color}),
        activeTab==='settings'   && e(SettingsTab,   {settings,setSettings,color})
      )
    );
  }

  // =============================
  // SalesPOS（会計：既存POS UIをこちらに集約）
  // =============================
  function SalesPOS({settings,setSettings,color}){
    // 初期メニュー（必要に応じて差し替え）
    const [menu] = useState([
      { id:"set_regular_60", category:"set", name:"レギュラー60", price:6000, flags:{serviceable:true,taxable:true} },
      { id:"drink_beer",     category:"drink", name:"生ビール",     price:800,  flags:{serviceable:true,taxable:true} },
      { id:"drink_shochu",   category:"drink", name:"芋焼酎(ロック)",price:900,  flags:{serviceable:true,taxable:true} },
      { id:"bottle_x",       category:"bottle",name:"ボトルX",       price:15000,flags:{serviceable:true,taxable:true, backTarget:true} },
      { id:"nomination_one", category:"nomination", name:"本指名",   price:3000, flags:{serviceable:true,taxable:true, backTarget:true} }
    ]);

    // 伝票
    const [tickets,setTickets] = useState(()=>{
      const first = { id: nextTicketId([]), seat:'A-1', openedAt: new Date().toLocaleTimeString(),
        orders:[], paymentType:'現金', customerName:'', isNewGuest:false, customerMemo:'', status:'open' };
      return [first];
    });
    const [activeTicketId,setActiveTicketId] = useState(()=>tickets[0]?.id);
    const activeTicket = tickets.find(t=>t.id===activeTicketId);
    const isPaid = activeTicket?.status === 'paid';
    const [splitCount, setSplitCount] = useState(2);

    // 計算
    const totals = useMemo(()=> calcTicket(activeTicket?.orders||[], settings), [activeTicket?.orders, settings]);

    // 永続化（簡易）
    useEffect(()=>{ tickets.forEach(t=> idbPut('tickets', {...t})); },[tickets]);

    // 操作
    function addOrder(item){
      if(isPaid) return;
      setTickets(ts=> ts.map(t=> t.id===activeTicketId
        ? ({...t, orders:[...t.orders, { id:item.id, name:item.name, price:item.price, qty:1, flags:item.flags||{serviceable:true,taxable:true} }]})
        : t));
    }
    function changeQty(orderIdx, delta){
      if(isPaid) return;
      setTickets(ts=> ts.map(t=>{
        if(t.id!==activeTicketId) return t;
        const orders = t.orders.map((o,i)=> i===orderIdx? {...o, qty: clamp((o.qty||1)+delta,1,99)} : o);
        return {...t, orders};
      }));
    }
    function removeOrder(orderIdx){
      if(isPaid) return;
      setTickets(ts=> ts.map(t=> t.id===activeTicketId? ({...t, orders: t.orders.filter((_,i)=>i!==orderIdx)}) : t));
    }
    function newTicket(){
      setTickets(ts=>{
        const nt = { id: nextTicketId(ts), seat:`A-${(ts.length%8)+1}`, openedAt:new Date().toLocaleTimeString(),
          orders:[], paymentType:'現金', customerName:'', isNewGuest:false, customerMemo:'', status:'open' };
        setActiveTicketId(nt.id);
        return [...ts, nt];
      });
    }

    // 分割：均等割（総額ベースの簡易明細）
    function equalSplit(count){
      if(isPaid) return;
      count = Math.max(2, Math.min(20, count||2));
      const { total } = totals;
      const per = Math.floor(total / count);
      const rests = total - per*count;

      const ids = tickets.filter(t=>t.id!==activeTicketId).slice(0, count-1).map(t=>t.id);
      // 不足分は新規伝票
      while(ids.length<count-1){
        const tId = nextTicketId(tickets);
        setTickets(ts=>[...ts,{id:tId, seat:'SPLIT', openedAt:new Date().toLocaleTimeString(), orders:[], paymentType: activeTicket.paymentType, status:'open' }]);
        ids.push(tId);
      }
      const makeLine=(n)=>({ id:`split_${Date.now()}_${Math.random()}`, name:`均等割(${count}人)`, price:n, qty:1, flags:{serviceable:true,taxable:true} });
      const updates = {};
      updates[activeTicketId] = { ...activeTicket, orders:[makeLine(per+rests)] };
      ids.forEach(id=>{
        updates[id] = { ...(tickets.find(t=>t.id===id) || {id, seat:'SPLIT', openedAt:new Date().toLocaleTimeString(), orders:[], paymentType:activeTicket.paymentType, status:'open'}),
          orders:[makeLine(per)] };
      });
      setTickets(ts=> ts.map(t=> updates[t.id]? updates[t.id] : t));
    }

    // 分割：明細移動（直前行を別伝票へ：簡易）
    function moveLastLineToOther(){
      if(isPaid) return;
      const idx = (activeTicket?.orders||[]).length-1;
      if(idx<0) return;
      // 既存の別伝票 or 新規
      let target = tickets.find(t=>t.id!==activeTicketId);
      if(!target){
        const tId = nextTicketId(tickets);
        target = {id:tId, seat:'SPLIT', openedAt:new Date().toLocaleTimeString(), orders:[], paymentType:activeTicket.paymentType, status:'open' };
        setTickets(ts=>[...ts, target]);
      }
      const moved = activeTicket.orders[idx];
      setTickets(ts=> ts.map(t=>{
        if(t.id===activeTicketId) return {...t, orders: t.orders.filter((_,i)=>i!==idx)};
        if(t.id===target.id)     return {...t, orders:[...(t.orders||[]), moved]};
        return t;
      }));
    }

    // 売上CSV
    function exportSalesCSV(){
      const rows=[];
      tickets.forEach(t=>{
        const c = calcTicket(t.orders||[], settings);
        rows.push({ id:t.id, seat:t.seat, openedAt:t.openedAt, customer:t.customerName||'', payment:t.paymentType, status:t.status||'open',
          subtotal:c.subtotal, service:c.serviceFee, tax:c.tax, total:c.total });
      });
      if(!rows.length) return alert('エクスポート対象がありません');
      download(`sales_${todayKey()}.csv`, toCSV(rows));
    }

    // 会計（確定）
    function settleTicket(){
      if(!activeTicket) return;
      setTickets(ts=> ts.map(t=> t.id===activeTicketId ? ({...t, status:'paid', closedAt:new Date().toLocaleString()}) : t));
      alert('会計を確定しました');
    }

    // UI
    return e('div',{className:"grid grid-cols-1 md:grid-cols-12 gap-6"},
      // 左：伝票リスト
      e('aside',{className:`md:col-span-3 ${color.panel} rounded-2xl border ${color.line}`},
        e('div',{className:'p-4 flex items-center justify-between'},
          e('div',{className:'font-bold tracking-wide', style:{color:color.gold}},'ASTORIA'),
          e('button',{onClick:newTicket, className:'px-3 py-1 rounded-lg border border-white/10 hover:bg-white/5'},'＋ 新規伝票')
        ),
        e('div',{className:'p-3 space-y-1 text-sm max-h-[60vh] overflow-y-auto'},
          tickets.map(t=> e('button',{
              key:t.id, onClick:()=>setActiveTicketId(t.id),
              className:`w-full px-3 py-2 rounded-lg text-left transition ${activeTicketId===t.id? 'bg-white/10 border border-white/20':'hover:bg-white/5 border border-transparent'}`
            },
            e('div',{className:'flex flex-col'},
              e('span',null,
                t.id,
                e('span',{className:'opacity-60'},` (${t.seat})`),
                t.status==='paid' && e('span',{className:'ml-2 text-[10px] px-2 py-0.5 rounded bg-green-600/30 border border-green-600/40'},'会計済')
              ),
              e('span',{className:'text-xs opacity-70'}, t.customerName || (t.isNewGuest? '新規様（後入力）':'—'))
            )
          ))
        ),
        e('div',{className:'p-3 flex gap-2 border-t border-white/10'},
          e('button',{onClick:exportSalesCSV, className:'px-3 py-2 rounded-lg border border-white/10 hover:bg-white/5 text-sm'},'売上CSV')
        )
      ),

      // 中央：メニュー
      e('section',{className:`md:col-span-4 ${color.panel} rounded-2xl border ${color.line}`},
        e('div',{className:'p-4 font-semibold flex items-center justify-between'},
          e('span',null,'メニュー'),
          e('span',{className:'text-xs opacity-70'}, isPaid? '会計済のため追加不可' : 'クリックで追加')
        ),
        e('div',{className:'grid grid-cols-2 gap-3 p-4'},
          menu.map(m=> e('button',{
              key:m.id, onClick:()=>addOrder(m), disabled:isPaid,
              className:`px-3 py-3 rounded-xl text-left border border-white/10 ${isPaid? 'bg-white/10 opacity-50 cursor-not-allowed':'bg-white/5 hover:bg-white/10'}`
            },
            e('div',{className:'font-medium'}, m.name),
            e('div',{className:'text-sm opacity-80'}, jpy(m.price))
          ))
        )
      ),

      // 右：伝票明細
      e('section',{className:`md:col-span-5 ${color.panel} rounded-2xl border ${color.line}`},
        e('div',{className:'p-4 flex items-center justify-between'},
          e('div',null,
            e('div',{className:'text-xs opacity-70'},'伝票ID'),
            e('div',{className:'font-semibold'}, activeTicket?.id || '—')
          ),
          e('div',null,
            e('div',{className:'text-xs opacity-70 text-right'},'来店者'),
            e('div',{className:'flex items-center gap-2 justify-end'},
              e('input',{type:'text', placeholder: activeTicket?.isNewGuest? '（後で入力）':'名前を入力',
                value:activeTicket?.customerName||'',
                onChange:(ev)=> setTickets(ts=> ts.map(t=> t.id===activeTicketId? {...t, customerName:ev.target.value}:t)),
                className:'bg-transparent border-b border-white/10 focus:outline-none w-40'}),
              e('label',{className:'inline-flex items-center gap-1 text-xs opacity-80'},
                e('input',{type:'checkbox',
                  checked:!!activeTicket?.isNewGuest,
                  onChange:(ev)=> setTickets(ts=> ts.map(t=> t.id===activeTicketId? {...t, isNewGuest:ev.target.checked}:t))}),
                '新規'
              )
            )
          )
        ),

        // 明細
        e('div',{className:'p-4 space-y-2'},
          (activeTicket?.orders||[]).map((o,idx)=> e('div',{key:idx, className:'flex items-center justify-between px-3 py-2 rounded-xl bg-white/5 border border-white/10'},
            e('div',null,
              e('div',{className:'font-medium'}, o.name),
              e('div',{className:'text-xs opacity-70'}, jpy(o.price), ' × ', o.qty)
            ),
            e('div',{className:'flex items-center gap-2'},
              e('button',{onClick:()=>changeQty(idx,-1), disabled:isPaid, className:`px-2 py-1 border border-white/10 rounded-lg ${isPaid?'opacity-50 cursor-not-allowed':''}`}, '－'),
              e('button',{onClick:()=>changeQty(idx,+1), disabled:isPaid, className:`px-2 py-1 border border-white/10 rounded-lg ${isPaid?'opacity-50 cursor-not-allowed':''}`}, '＋'),
              e('button',{onClick:()=>removeOrder(idx), disabled:isPaid, className:`px-2 py-1 border border-white/10 rounded-lg ${isPaid?'opacity-50 cursor-not-allowed':''}`}, '✕')
            )
          ))
        ),

        // 合計
        e('div',{className:'p-4 border-t border-white/10'},
          e('div',{className:'flex items-center justify-between text-sm opacity-80'}, e('span',null,'小計'), e('span',null,jpy(totals.subtotal))),
          e('div',{className:'flex items-center justify-between text-sm opacity-80'}, e('span',null,'サービス料'), e('span',null,jpy(totals.serviceFee))),
          e('div',{className:'flex items-center justify-between text-sm opacity-80'}, e('span',null,'消費税'), e('span',null,jpy(totals.tax))),
          e('div',{className:'flex items-center justify-between mt-3 text-lg font-bold'}, e('span',null,'合計'), e('span',{style:{color:color.gold}}, jpy(totals.total)))
        ),

        // 支払/分割
        e('div',{className:'p-4 flex items-center justify-between gap-2'},
          e('select',{value:activeTicket?.paymentType,
              onChange:(ev)=> setTickets(ts=> ts.map(t=> t.id===activeTicketId? {...t, paymentType:ev.target.value}:t)), disabled:isPaid,
              className:`bg-transparent border border-white/10 rounded-xl px-3 py-2 ${isPaid?'opacity-50 cursor-not-allowed':''}`},
            settings.payments.map(p=> e('option',{key:p,className:'text-black'}, p))
          ),
          e('div',{className:'flex flex-wrap gap-2 items-center'},
            e('button',{onClick:()=>equalSplit(2), disabled:isPaid, className:`px-3 py-2 rounded-xl border border-white/10 ${isPaid?'opacity-50 cursor-not-allowed':'hover:bg-white/5'}`}, '2人割'),
            e('button',{onClick:()=>equalSplit(3), disabled:isPaid, className:`px-3 py-2 rounded-xl border border-white/10 ${isPaid?'opacity-50 cursor-not-allowed':'hover:bg-white/5'}`}, '3人割'),
            e('div',{className:'flex items-center gap-2'},
              e('input',{type:'number', min:2, max:20, value:splitCount, onChange:(ev)=> setSplitCount(clamp(Number(ev.target.value)||2,2,20)), disabled:isPaid,
                className:`w-20 bg-transparent border border-white/10 rounded-xl px-2 py-2 text-sm ${isPaid?'opacity-50 cursor-not-allowed':''}`}),
              e('button',{onClick:()=>equalSplit(splitCount), disabled:isPaid, className:`px-3 py-2 rounded-xl border border-white/10 ${isPaid?'opacity-50 cursor-not-allowed':'hover:bg-white/5'}`}, '人数割')
            ),
            e('button',{onClick:()=>moveLastLineToOther(), disabled:isPaid, className:`px-3 py-2 rounded-xl border border-white/10 ${isPaid?'opacity-50 cursor-not-allowed':'hover:bg-white/5'}`}, '直前行を別伝票へ'),
            e('button',{onClick:settleTicket, className:'px-3 py-2 rounded-xl border border-green-600/40 hover:bg-green-600/10'}, isPaid? '会計済' : '会計（確定）')
          )
        )
      )
    );
  }

  // =============================
  // Attendance（勤怠：既存があればここへ、なければプレースホルダ）
  // =============================
  function AttendanceTab({settings,color}){
    return e('div',{className:`${color.panel} p-6 rounded-2xl border ${color.line} space-y-2`},
      e('div',{className:'text-lg font-semibold'},'勤怠管理'),
      e('div',{className:'text-sm opacity-80'},'※ 既存の勤怠UIがある場合はここに統合します（今回はプレースホルダ）。')
    );
  }

  // =============================
  // Payroll（給与管理：MVPの簡易集計 + CSV）
  // =============================
  function PayrollTab({settings,color}){
    const [staff, setStaff] = useState([
      { id:'s1', name:'山田', role:'キャスト', hourly:1200 },
      { id:'s2', name:'佐藤', role:'レジ',    hourly:1100 }
    ]);
    const [work, setWork] = useState({
      s1:{ hours:0, bonus:0, bottle:0 },
      s2:{ hours:0, bonus:0, bottle:0 }
    });

    const rows = useMemo(()=>{
      return staff.map(s=>{
        const w = work[s.id] || {hours:0, bonus:0, bottle:0};
        const base  = (Number(s.hourly)||0) * (Number(w.hours)||0);
        const total = base + (Number(w.bonus)||0) + (Number(w.bottle)||0);
        return { staff:s.name, role:s.role, hours:w.hours, hourly:s.hourly, base, bonus:w.bonus, bottle:w.bottle, total };
      });
    },[staff, work]);

    return e('div',{className:`${color.panel} p-6 rounded-2xl border ${color.line} space-y-4`},
      e('div',{className:'flex items-center justify-between'},
        e('div',{className:'text-lg font-semibold'},'給与管理'),
        e('div',{className:'flex gap-2'},
          e('button',{onClick:()=>{
              const id='s'+Date.now();
              setStaff(arr=>[...arr, { id, name:'新規', role:'', hourly:1000 }]);
              setWork(w=>({...w, [id]:{hours:0, bonus:0, bottle:0}}));
            }, className:'px-3 py-2 rounded-xl border border-white/10 hover:bg-white/5 text-sm'},'＋ スタッフ'),
          e('button',{onClick:()=> download(`payroll_${todayKey()}.csv`, toCSV(rows)), className:'px-3 py-2 rounded-xl border border-white/10 hover:bg-white/5 text-sm'},'給与CSV')
        )
      ),

      // 編集行
      e('div',{className:'grid grid-cols-1 gap-2'},
        staff.map(s=> e('div',{key:s.id, className:'grid grid-cols-12 gap-2 items-center px-3 py-2 rounded-xl bg-white/5 border border-white/10'},
          e('input',{className:'col-span-3 bg-transparent border-b border-white/10', value:s.name,
            onChange:(ev)=> setStaff(arr=> arr.map(x=> x.id===s.id? {...x, name:ev.target.value}:x))}),
          e('input',{className:'col-span-2 bg-transparent border-b border-white/10', value:s.role, placeholder:'役割',
            onChange:(ev)=> setStaff(arr=> arr.map(x=> x.id===s.id? {...x, role:ev.target.value}:x))}),
          e('input',{type:'number', className:'col-span-2 bg-transparent border-b border-white/10', value:s.hourly,
            onChange:(ev)=> setStaff(arr=> arr.map(x=> x.id===s.id? {...x, hourly:Number(ev.target.value)||0}:x))}),
          e('input',{type:'number', className:'col-span-1 bg-transparent border-b border-white/10', value:(work[s.id]?.hours)||0, placeholder:'時間',
            onChange:(ev)=> setWork(w=>({...w, [s.id]:{...(w[s.id]||{}), hours:Number(ev.target.value)||0}}))}),
          e('input',{type:'number', className:'col-span-2 bg-transparent border-b border-white/10', value:(work[s.id]?.bonus)||0, placeholder:'ボーナス',
            onChange:(ev)=> setWork(w=>({...w, [s.id]:{...(w[s.id]||{}), bonus:Number(ev.target.value)||0}}))}),
          e('input',{type:'number', className:'col-span-2 bg-transparent border-b border-white/10', value:(work[s.id]?.bottle)||0, placeholder:'ボトル',
            onChange:(ev)=> setWork(w=>({...w, [s.id]:{...(w[s.id]||{}), bottle:Number(ev.target.value)||0}}))})
        ))
      ),

      // 集計表
      e('div',{className:'overflow-x-auto'},
        e('table',{className:'w-full text-sm'},
          e('thead',null,
            e('tr',{className:'text-left opacity-70'},
              e('th',null,'スタッフ'),
              e('th',null,'役割'),
              e('th',null,'時間'),
              e('th',null,'時給'),
              e('th',null,'基本給'),
              e('th',null,'ボーナス'),
              e('th',null,'ボトル'),
              e('th',null,'合計')
            )
          ),
          e('tbody',null,
            rows.map((r,i)=> e('tr',{key:i},
              e('td',null,r.staff),
              e('td',null,r.role),
              e('td',null,r.hours),
              e('td',null,jpy(r.hourly)),
              e('td',null,jpy(r.base)),
              e('td',null,jpy(r.bonus)),
              e('td',null,jpy(r.bottle)),
              e('td',{className:'font-semibold'}, jpy(r.total))
            ))
          )
        )
      )
    );
  }

  // =============================
  // Settings（各種設定：モーダル→タブ常設）
  // =============================
  function SettingsTab({settings,setSettings,color}){
    return e('div',{className:`${color.panel} p-6 rounded-2xl border ${color.line}`},
      e('div',{className:'text-lg font-semibold mb-3'},'各種設定'),
      e('div',{className:'grid grid-cols-1 md:grid-cols-2 gap-4'},
        e(FieldNumber,{label:'サービス料（%）', value: Math.round((settings.serviceFeeRate||0)*100),
          onChange:(v)=> setSettings(s=>({...s, serviceFeeRate: (v||0)/100 }))}),
        e(FieldNumber,{label:'消費税（%）', value: Math.round((settings.taxRate||0)*100),
          onChange:(v)=> setSettings(s=>({...s, taxRate: (v||0)/100 }))}),
        e(FieldSelect,{label:'端数処理（方法）', value: settings.rounding?.method||'round',
          options:[[ 'round','四捨五入' ],[ 'ceil','切上げ' ],[ 'floor','切捨て' ]],
          onChange:(v)=> setSettings(s=>({...s, rounding:{...s.rounding, method:v}}))}),
        e(FieldNumber,{label:'端数処理（単位円）', value: settings.rounding?.unit||100,
          onChange:(v)=> setSettings(s=>({...s, rounding:{...s.rounding, unit: v||1 }}))}),
        e(FieldNumber,{label:'日次締めの基準時（時）', value: settings.closing?.dailyCutoffHour||5,
          onChange:(v)=> setSettings(s=>({...s, closing:{...s.closing, dailyCutoffHour: clamp(v,0,23)}}))}),
        e(FieldNumber,{label:'給与支払日（毎月）', value: settings.payroll?.payday||15,
          onChange:(v)=> setSettings(s=>({...s, payroll:{...s.payroll, payday: clamp(v,1,28)}}))})
      ),
      e('div',{className:'text-xs opacity-70 mt-3'},'※ 設定はブラウザ（IndexedDB）に保存されます')
    );
  }

  // =============================
  // Field Components
  // =============================
  function FieldNumber({label,value,onChange}){
    return e('label',{className:'flex flex-col gap-1'},
      e('span',{className:'text-xs opacity-70'},label),
      e('input',{type:'number', value:value??'', onChange:(ev)=>onChange(Number(ev.target.value)),
        className:'bg-transparent border border-white/10 rounded-lg px-3 py-2'})
    );
  }
  function FieldSelect({label,value,options,onChange}){
    return e('label',{className:'flex flex-col gap-1'},
      e('span',{className:'text-xs opacity-70'},label),
      e('select',{value, onChange:(ev)=>onChange(ev.target.value),
          className:'bg-transparent border border-white/10 rounded-lg px-3 py-2'},
        options.map(([v,txt])=> e('option',{key:v,value:v,className:'text-black'},txt))
      )
    );
  }

  // =============================
  // Mount
  // =============================
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(e(App));
})();
