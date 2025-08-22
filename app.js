// React要素の簡略化
const { useState, useEffect, useMemo } = React;
const e = React.createElement;

// ユーティリティ関数
const uid = () => Math.random().toString(36).slice(2, 10);
const todayISO = () => new Date().toISOString().slice(0, 10);
const nowLocal = () => new Date().toISOString().slice(0, 16);
const minutesBetween = (start, end) => {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (isNaN(s) || isNaN(e)) return 0;
  return Math.max(0, Math.round((e - s) / 60000));
};
const currency = (n) => (n || 0).toLocaleString();

// LocalStorage キー
const LS_KEYS = {
  MENU: "nightpos.menu",
  STAFF: "nightpos.staff",
  TICKETS: "nightpos.tickets",
  ATTEND: "nightpos.attendance",
  SETTINGS: "nightpos.settings",
};

// LocalStorage操作
const loadLS = (k, fallback) => {
  try {
    const raw = localStorage.getItem(k);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};
const saveLS = (k, v) => localStorage.setItem(k, JSON.stringify(v));

// デフォルトデータ
const defaultMenu = [
  {
    id: uid(),
    code: "SET60",
    name: "セット60分",
    category: "時間",
    price: 3000,
    taxRate: 10,
    serviceRate: 10,
    unit: "minute",
    unitValue: 60,
    pricing: "perUnit",
    active: true,
  },
  {
    id: uid(),
    code: "BOTTLE",
    name: "ボトル",
    category: "ドリンク",
    price: 6000,
    taxRate: 10,
    serviceRate: 10,
    unit: "item",
    unitValue: 1,
    pricing: "fixed",
    active: true,
  },
  {
    id: uid(),
    code: "SHOT",
    name: "ショット",
    category: "ドリンク",
    price: 1200,
    taxRate: 10,
    serviceRate: 10,
    unit: "item",
    unitValue: 1,
    pricing: "fixed",
    active: true,
  },
  {
    id: uid(),
    code: "NOMINATION",
    name: "指名料",
    category: "オプション",
    price: 2000,
    taxRate: 10,
    serviceRate: 0,
    unit: "item",
    unitValue: 1,
    pricing: "fixed",
    active: true,
  },
];

const defaultStaff = [
  { id: uid(), code: "S001", name: "まゆみ", role: "キャスト", active: true },
  { id: uid(), code: "S002", name: "しずな", role: "キャスト", active: true },
  { id: uid(), code: "S003", name: "ママ", role: "キャスト", active: true },
];

const defaultSettings = {
  storeName: "アット",
  currency: "JPY",
  receiptFooter: "ご来店ありがとうございました。",
};

// コンポーネント: Badge
function Badge({ children }) {
  return e(
    'span',
    { className: "inline-flex items-center rounded-full border px-2 py-0.5 text-xs" },
    children
  );
}

// コンポーネント: Pill
function Pill({ active, onClick, children }) {
  return e(
    'button',
    {
      onClick: onClick,
      className: `px-3 py-1 rounded-full border text-sm transition ${
        active ? "bg-black text-white" : "bg-white hover:bg-gray-50"
      }`
    },
    children
  );
}

// コンポーネント: Card
function Card({ title, action, children }) {
  return e(
    'div',
    { className: "rounded-2xl border p-4 shadow-sm bg-white" },
    e(
      'div',
      { className: "flex items-center justify-between mb-3" },
      e('h3', { className: "font-semibold" }, title),
      action
    ),
    e('div', null, children)
  );
}

// コンポーネント: DynamicForm
function DynamicForm({ schema, value, onChange, onSubmit, submitLabel = "保存" }) {
  const [data, setData] = useState(value || {});
  
  useEffect(() => setData(value || {}), [value]);

  const handle = (k, v) => {
    const next = { ...data, [k]: v };
    setData(next);
    onChange && onChange(next);
  };

  const handleSubmit = (ev) => {
    ev.preventDefault();
    onSubmit && onSubmit(data);
  };

  return e(
    'form',
    {
      onSubmit: handleSubmit,
      className: "grid grid-cols-1 md:grid-cols-2 gap-3"
    },
    schema.fields.map((f) =>
      e(
        'div',
        { key: f.key, className: "flex flex-col gap-1" },
        e('label', { className: "text-xs text-gray-500" }, f.label),
        f.type === "select"
          ? e(
              'select',
              {
                className: "border rounded-xl px-3 py-2",
                value: data[f.key] ?? "",
                onChange: (ev) => handle(f.key, ev.target.value)
              },
              e('option', { value: "", disabled: true }, "選択してください"),
              f.options?.map((o) =>
                e('option', { key: o.value, value: o.value }, o.label)
              )
            )
          : f.type === "number"
          ? e('input', {
              type: "number",
              className: "border rounded-xl px-3 py-2",
              value: data[f.key] ?? "",
              onChange: (ev) => handle(f.key, Number(ev.target.value)),
              step: f.step || 1,
              min: f.min
            })
          : f.type === "datetime"
          ? e('input', {
              type: "datetime-local",
              className: "border rounded-xl px-3 py-2",
              value: data[f.key] ?? "",
              onChange: (ev) => handle(f.key, ev.target.value)
            })
          : e('input', {
              type: "text",
              className: "border rounded-xl px-3 py-2",
              value: data[f.key] ?? "",
              onChange: (ev) => handle(f.key, ev.target.value),
              placeholder: f.placeholder
            })
      )
    ),
    e(
      'div',
      { className: "md:col-span-2 flex justify-end gap-2 mt-2" },
      schema.extraActions?.map((btn) =>
        e(
          'button',
          {
            key: btn.label,
            type: "button",
            className: "px-4 py-2 rounded-xl border",
            onClick: () => btn.onClick?.(data)
          },
          btn.label
        )
      ),
      e(
        'button',
        { type: "submit", className: "px-4 py-2 rounded-xl border bg-black text-white" },
        submitLabel
      )
    )
  );
}

// コンポーネント: MenuMaster
function MenuMaster() {
  const [menu, setMenu] = useState(() => loadLS(LS_KEYS.MENU, defaultMenu));
  const [filter, setFilter] = useState("all");
  const [edit, setEdit] = useState(null);
  
  useEffect(() => saveLS(LS_KEYS.MENU, menu), [menu]);

  const schema = {
    fields: [
      { key: "code", label: "コード" },
      { key: "name", label: "名称" },
      { key: "category", label: "カテゴリ" },
      { key: "price", label: "単価", type: "number", step: 100 },
      { key: "taxRate", label: "税率%", type: "number", step: 1 },
      { key: "serviceRate", label: "サービス%", type: "number", step: 1 },
      {
        key: "unit",
        label: "単位",
        type: "select",
        options: [
          { value: "item", label: "個" },
          { value: "minute", label: "分" },
        ],
      },
      { key: "unitValue", label: "単位量", type: "number" },
      {
        key: "pricing",
        label: "課金方式",
        type: "select",
        options: [
          { value: "fixed", label: "固定" },
          { value: "perUnit", label: "単位ごと" },
        ],
      },
    ],
  };

  const filtered = useMemo(
    () => menu.filter((m) => (filter === "all" ? true : m.category === filter)),
    [menu, filter]
  );

  const categories = useMemo(() => {
    const s = new Set(menu.map((m) => m.category));
    return ["all", ...Array.from(s)];
  }, [menu]);

  const upsert = (input) => {
    const hasId = Boolean(edit?.id);
    const rec = hasId ? { ...edit, ...input } : { id: uid(), active: true, ...input };
    setMenu((prev) => {
      if (hasId) return prev.map((p) => (p.id === rec.id ? rec : p));
      return [...prev, rec];
    });
    setEdit(null);
  };

  const remove = (id) => setMenu((prev) => prev.filter((p) => p.id !== id));

  const exportMenu = () => {
    const blob = new Blob([JSON.stringify(menu, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `menu_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importMenu = (ev) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(reader.result);
        if (Array.isArray(json)) setMenu(json);
      } catch {}
    };
    reader.readAsText(file);
  };

  return e(
    'div',
    { className: "space-y-4" },
    e(
      Card,
      {
        title: "メニュー登録/編集 (JSON保存)",
        action: e(
          'div',
          { className: "flex gap-2" },
          categories.map((c) =>
            e(Pill, { key: c, active: filter === c, onClick: () => setFilter(c) }, c)
          ),
          e('button', { className: "px-3 py-1 rounded-xl border", onClick: exportMenu }, "エクスポート"),
          e(
            'label',
            { className: "px-3 py-1 rounded-xl border cursor-pointer" },
            "インポート",
            e('input', {
              type: "file",
              className: "hidden",
              accept: "application/json",
              onChange: importMenu
            })
          )
        )
      },
      e(DynamicForm, {
        schema: schema,
        value: edit || {},
        onSubmit: upsert,
        submitLabel: edit ? "更新" : "追加"
      })
    ),
    e(
      'div',
      { className: "grid md:grid-cols-2 gap-3" },
      filtered.map((m) =>
        e(
          'div',
          { key: m.id, className: "fade-in" },
          e(
            Card,
            {
              title: e(
                'div',
                { className: "flex items-center gap-2" },
                e('span', null, m.name),
                e(Badge, null, m.category)
              ),
              action: e(
                'div',
                { className: "flex gap-2" },
                e('button', { className: "px-3 py-1 rounded-xl border", onClick: () => setEdit(m) }, "編集"),
                e('button', { className: "px-3 py-1 rounded-xl border", onClick: () => remove(m.id) }, "削除")
              )
            },
            e(
              'div',
              { className: "text-sm grid grid-cols-2 gap-2" },
              e('div', null, `コード: ${m.code}`),
              e('div', null, `単価: ¥${currency(m.price)}`),
              e('div', null, `税率: ${m.taxRate}%`),
              e('div', null, `サービス: ${m.serviceRate}%`),
              e('div', null, `単位: ${m.unit}`),
              e('div', null, `課金: ${m.pricing}`)
            )
          )
        )
      )
    )
  );
}

// コンポーネント: TicketEntry
function TicketEntry() {
  const [menu] = useState(() => loadLS(LS_KEYS.MENU, defaultMenu));
  const [tickets, setTickets] = useState(() => loadLS(LS_KEYS.TICKETS, []));
  const [staff] = useState(() => loadLS(LS_KEYS.STAFF, defaultStaff));
  const [openTickets, setOpenTickets] = useState([]);
  const [currentTicketId, setCurrentTicketId] = useState(null);
  
  useEffect(() => saveLS(LS_KEYS.TICKETS, tickets), [tickets]);

  const createNewTicket = () => ({
    id: uid(),
    date: todayISO(),
    customer: "",
    staffId: staff[0]?.id,
    table: "",
    checkin: nowLocal(),
    checkout: "",
    items: [],
    discount: 0,
    memo: "",
    status: "open",
  });
  
  const [draft, setDraft] = useState(createNewTicket());

  // 新規伝票作成
  const createTicket = () => {
    const newTicket = createNewTicket();
    setOpenTickets(prev => [...prev, newTicket]);
    setDraft(newTicket);
    setCurrentTicketId(newTicket.id);
  };

  // 伝票切り替え
  const switchTicket = (ticketId) => {
    // 現在の伝票を保存
    if (currentTicketId) {
      setOpenTickets(prev => prev.map(t => t.id === currentTicketId ? draft : t));
    }
    // 新しい伝票を読み込み
    const ticket = openTickets.find(t => t.id === ticketId);
    if (ticket) {
      setDraft(ticket);
      setCurrentTicketId(ticketId);
    }
  };

  // 伝票削除（キャンセル）
  const cancelTicket = (ticketId) => {
    setOpenTickets(prev => prev.filter(t => t.id !== ticketId));
    if (currentTicketId === ticketId) {
      const remaining = openTickets.filter(t => t.id !== ticketId);
      if (remaining.length > 0) {
        switchTicket(remaining[0].id);
      } else {
        const newTicket = createNewTicket();
        setDraft(newTicket);
        setCurrentTicketId(null);
      }
    }
  };

  // 初回起動時に空の伝票がなければ作成
  useEffect(() => {
    if (openTickets.length === 0 && !currentTicketId) {
      createTicket();
    }
  }, []);

  const menuOpts = menu.filter((m) => m.active).map((m) => ({ value: m.id, label: `${m.name} (¥${m.price})` }));
  const staffOpts = staff.filter((s) => s.active).map((s) => ({ value: s.id, label: s.name }));

  const calcTicket = (t) => {
    const mins = t.checkout ? minutesBetween(t.checkin, t.checkout) : 0;
    let subtotal = 0;
    let service = 0;
    let tax = 0;

    t.items.forEach((it) => {
      const m = menu.find((x) => x.id === it.menuId);
      if (!m) return;
      const qty = it.qty ?? 1;
      let basePrice = 0;
      if (m.pricing === "fixed") basePrice = m.price * qty;
      else if (m.pricing === "perUnit" && m.unit === "minute") {
        const units = Math.ceil(mins / (m.unitValue || 60));
        basePrice = m.price * units;
      } else if (m.pricing === "perUnit" && m.unit === "item") {
        basePrice = m.price * qty;
      }
      const svc = Math.round((basePrice * (m.serviceRate || 0)) / 100);
      const tx = Math.round(((basePrice + svc) * (m.taxRate || 0)) / 100);
      subtotal += basePrice;
      service += svc;
      tax += tx;
    });

    const total = Math.max(0, subtotal + service + tax - (t.discount || 0));
    return { mins, subtotal, service, tax, total };
  };

  const totals = calcTicket(draft);

  const addItem = () =>
    setDraft((d) => ({
      ...d,
      items: [
        ...d.items,
        { id: uid(), menuId: menu[0]?.id, name: menu[0]?.name, qty: 1, price: menu[0]?.price },
      ],
    }));

  const setItem = (id, patch) =>
    setDraft((d) => ({
      ...d,
      items: d.items.map((it) => (it.id === id ? { ...it, ...patch } : it)),
    }));

  const removeItem = (id) => setDraft((d) => ({ ...d, items: d.items.filter((it) => it.id !== id) }));

  const saveTicket = () => {
    // 伝票を精算済みにして保存
    const closedTicket = { ...draft, status: "closed", checkout: draft.checkout || nowLocal() };
    setTickets((prev) => [closedTicket, ...prev]);
    
    // 開いている伝票リストから削除
    setOpenTickets(prev => prev.filter(t => t.id !== draft.id));
    
    // 残りの開いている伝票があれば最初のものに切り替え
    const remaining = openTickets.filter(t => t.id !== draft.id);
    if (remaining.length > 0) {
      switchTicket(remaining[0].id);
    } else {
      // 新しい空の伝票を作成
      const newTicket = createNewTicket();
      setDraft(newTicket);
      setCurrentTicketId(null);
    }
  };

  return e(
    'div',
    { className: "grid lg:grid-cols-5 gap-4" },
    e(
      'div',
      { className: "lg:col-span-3 space-y-3" },
      e(
        Card,
        { 
          title: e(
            'div',
            { className: "flex items-center justify-between w-full" },
            e('span', null, `伝票 ${draft.table ? `(${draft.table})` : '(新規)'}`),
            e(
              'button',
              { 
                className: "px-3 py-1 rounded-xl border bg-green-500 text-white text-sm",
                onClick: createTicket
              },
              "+ 新規伝票"
            )
          )
        },
        e(
          'div',
          { className: "grid grid-cols-2 gap-3" },
          e(
            'div',
            { className: "flex flex-col gap-1" },
            e('label', { className: "text-xs text-gray-500" }, "来店日"),
            e('input', {
              type: "date",
              className: "border rounded-xl px-3 py-2",
              value: draft.date,
              onChange: (ev) => setDraft({ ...draft, date: ev.target.value })
            })
          ),
          e(
            'div',
            { className: "flex flex-col gap-1" },
            e('label', { className: "text-xs text-gray-500" }, "担当"),
            e(
              'select',
              {
                className: "border rounded-xl px-3 py-2",
                value: draft.staffId,
                onChange: (ev) => setDraft({ ...draft, staffId: ev.target.value })
              },
              staffOpts.map((o) => e('option', { key: o.value, value: o.value }, o.label))
            )
          ),
          e(
            'div',
            { className: "flex flex-col gap-1" },
            e('label', { className: "text-xs text-gray-500" }, "お客様名"),
            e('input', {
              className: "border rounded-xl px-3 py-2",
              value: draft.customer,
              onChange: (ev) => setDraft({ ...draft, customer: ev.target.value }),
              placeholder: "例: 山田様"
            })
          ),
          e(
            'div',
            { className: "flex flex-col gap-1" },
            e('label', { className: "text-xs text-gray-500" }, "卓/席"),
            e('input', {
              className: "border rounded-xl px-3 py-2",
              value: draft.table,
              onChange: (ev) => setDraft({ ...draft, table: ev.target.value }),
              placeholder: "A-3 など"
            })
          ),
          e(
            'div',
            { className: "flex flex-col gap-1" },
            e('label', { className: "text-xs text-gray-500" }, "入店"),
            e('input', {
              type: "datetime-local",
              className: "border rounded-xl px-3 py-2",
              value: draft.checkin,
              onChange: (ev) => setDraft({ ...draft, checkin: ev.target.value })
            })
          ),
          e(
            'div',
            { className: "flex flex-col gap-1" },
            e('label', { className: "text-xs text-gray-500" }, "退店"),
            e('input', {
              type: "datetime-local",
              className: "border rounded-xl px-3 py-2",
              value: draft.checkout,
              onChange: (ev) => setDraft({ ...draft, checkout: ev.target.value })
            })
          )
        ),
        e(
          'div',
          { className: "mt-4" },
          e(
            'div',
            { className: "flex items-center justify-between mb-2" },
            e('h4', { className: "font-medium" }, "明細"),
            e('button', { className: "px-3 py-1 rounded-xl border", onClick: addItem }, "行追加")
          ),
          e(
            'div',
            { className: "rounded-2xl border overflow-hidden" },
            e(
              'table',
              { className: "w-full text-sm" },
              e(
                'thead',
                { className: "bg-gray-50" },
                e(
                  'tr',
                  null,
                  e('th', { className: "p-2 text-left" }, "メニュー"),
                  e('th', { className: "p-2 text-right" }, "数量"),
                  e('th', { className: "p-2 text-right" }, "単価"),
                  e('th', { className: "p-2 text-right" }, "小計"),
                  e('th', { className: "p-2" })
                )
              ),
              e(
                'tbody',
                null,
                draft.items.map((it) => {
                  const m = menu.find((x) => x.id === it.menuId) || {};
                  const qty = it.qty ?? 1;
                  const unitPrice = m.price ?? 0;
                  const rowSub = unitPrice * qty;
                  return e(
                    'tr',
                    { key: it.id, className: "border-t" },
                    e(
                      'td',
                      { className: "p-2" },
                      e(
                        'select',
                        {
                          className: "luxury-input w-full",
                          value: it.menuId,
                          onChange: (ev) => {
                            const mId = ev.target.value;
                            const mm = menu.find((x) => x.id === mId);
                            setItem(it.id, {
                              menuId: mId,
                              name: mm?.name,
                              price: mm?.price,
                            });
                          }
                        },
                        menuOpts.map((o) => e('option', { key: o.value, value: o.value }, o.label))
                      )
                    ),
                    e(
                      'td',
                      { className: "p-2 text-right" },
                      e('input', {
                        type: "number",
                        className: "luxury-input w-24 text-right",
                        value: qty,
                        min: 1,
                        onChange: (ev) => setItem(it.id, { qty: Number(ev.target.value) })
                      })
                    ),
                    e('td', { className: "p-2 text-right" }, `¥${currency(unitPrice)}`),
                    e('td', { className: "p-2 text-right" }, `¥${currency(rowSub)}`),
                    e(
                      'td',
                      { className: "p-2 text-right" },
                      e('button', { className: "px-3 py-1 rounded-xl border", onClick: () => removeItem(it.id) }, "削除")
                    )
                  );
                }),
                draft.items.length === 0 &&
                  e(
                    'tr',
                    null,
                    e('td', { colSpan: 5, className: "p-4 text-center text-gray-500" }, "明細がありません。「行追加」から追加してください。")
                  )
              )
            )
          )
        ),
        e(
          'div',
          { className: "mt-4 grid grid-cols-2 gap-3 items-start" },
          e(
            'div',
            null,
            e('label', { className: "text-xs text-gray-500" }, "メモ"),
            e('textarea', {
              className: "border rounded-xl px-3 py-2 w-full h-24",
              value: draft.memo,
              onChange: (ev) => setDraft({ ...draft, memo: ev.target.value })
            })
          ),
          e(
            'div',
            { className: "rounded-2xl border p-3 bg-gray-50" },
            e('div', { className: "flex justify-between text-sm" }, e('span', null, "在店時間"), e('span', null, `${totals.mins} 分`)),
            e('div', { className: "flex justify-between text-sm" }, e('span', null, "小計"), e('span', null, `¥${currency(totals.subtotal)}`)),
            e('div', { className: "flex justify-between text-sm" }, e('span', null, "サービス料"), e('span', null, `¥${currency(totals.service)}`)),
            e('div', { className: "flex justify-between text-sm" }, e('span', null, "消費税"), e('span', null, `¥${currency(totals.tax)}`)),
            e(
              'div',
              { className: "flex justify-between items-center text-sm mt-2" },
              e('span', null, "値引き"),
              e('input', {
                type: "number",
                className: "luxury-input w-28 text-right",
                value: draft.discount,
                min: 0,
                onChange: (ev) => setDraft({ ...draft, discount: Number(ev.target.value) })
              })
            ),
            e(
              'div',
              { className: "mt-3 flex justify-between font-semibold text-lg" },
              e('span', null, "合計"),
              e('span', null, `¥${currency(totals.total)}`)
            ),
            e(
              'div',
              { className: "mt-3 flex justify-end gap-2" },
              e('button', { className: "px-4 py-2 rounded-xl border", onClick: () => {
                if (confirm("伝票をクリアしますか？")) {
                  const newTicket = createNewTicket();
                  setDraft(newTicket);
                }
              }}, "クリア"),
              e('button', { className: "px-4 py-2 rounded-xl border bg-black text-white", onClick: saveTicket }, "精算")
            )
          )
        )
      )
    ),
    e(
      'div',
      { className: "lg:col-span-2 space-y-3" },
      openTickets.length > 0 && e(
        Card,
        { title: `開いている伝票 (${openTickets.length}件)` },
        e(
          'div',
          { className: "space-y-2 max-h-[300px] overflow-auto pr-1" },
          openTickets.map((t) => {
            const ticketTotal = calcTicket(t).total;
            const isActive = t.id === currentTicketId;
            return e(
              'div',
              { 
                key: t.id, 
                className: `rounded-xl border p-3 cursor-pointer transition ${isActive ? 'border-black bg-gray-50' : 'hover:bg-gray-50'}`,
                onClick: () => switchTicket(t.id)
              },
              e(
                'div',
                { className: "flex justify-between items-start" },
                e(
                  'div',
                  { className: "flex-1" },
                  e(
                    'div',
                    { className: "flex items-center gap-2" },
                    e('div', { className: "font-medium" }, t.table || "テーブル未設定"),
                    isActive && e('span', { className: "text-xs bg-black text-white px-2 py-0.5 rounded" }, "編集中")
                  ),
                  e('div', { className: "text-sm text-gray-500" }, t.customer || "お客様名未設定"),
                  e('div', { className: "text-xs text-gray-400" }, `入店: ${new Date(t.checkin).toLocaleTimeString('ja-JP', {hour: '2-digit', minute: '2-digit'})}`)
                ),
                e(
                  'div',
                  { className: "text-right" },
                  e('div', { className: "font-semibold" }, `¥${currency(ticketTotal)}`),
                  e(
                    'button',
                    { 
                      className: "text-xs text-red-500 hover:text-red-700 mt-1",
                      onClick: (ev) => {
                        ev.stopPropagation();
                        if (confirm(`テーブル${t.table || '(未設定)'}の伝票をキャンセルしますか？`)) {
                          cancelTicket(t.id);
                        }
                      }
                    },
                    "キャンセル"
                  )
                )
              ),
              t.items.length > 0 && e(
                'div',
                { className: "mt-2 text-xs text-gray-600" },
                t.items.slice(0, 3).map((i) => e('span', { key: i.id, className: "mr-2" }, `${i.name}×${i.qty}`)),
                t.items.length > 3 && e('span', { className: "text-gray-400" }, `他${t.items.length - 3}件`)
              )
            );
          })
        )
      ),
      e(
        Card,
        { title: "精算済み伝票" },
        e(
          'div',
          { className: "space-y-2 max-h-[600px] overflow-auto pr-1" },
          tickets.map((t) =>
            e(
              'div',
              { key: t.id, className: "rounded-xl border p-3" },
              e(
                'div',
                { className: "flex justify-between text-sm" },
                e(
                  'div',
                  null,
                  e('div', { className: "font-medium" }, t.customer || "無名"),
                  e('div', { className: "text-gray-500" }, `${t.date} / 席 ${t.table || "-"}`)
                ),
                e(
                  'div',
                  { className: "text-right" },
                  e('div', { className: "text-xs text-gray-500" }, "合計"),
                  e('div', { className: "font-semibold" }, `¥${currency(t.items.reduce((a, c) => a + (c.price || 0) * (c.qty || 1), 0))}`)
                )
              ),
              e(
                'div',
                { className: "mt-2 text-xs text-gray-600" },
                t.items.map((i) => e('span', { key: i.id, className: "mr-2" }, `${i.name}×${i.qty}`))
              )
            )
          ),
          tickets.length === 0 && e('div', { className: "text-sm text-gray-500" }, "まだ伝票がありません。")
        )
      )
    )
  );
}

// コンポーネント: Attendance
function Attendance() {
  const [staff, setStaff] = useState(() => loadLS(LS_KEYS.STAFF, defaultStaff));
  const [records, setRecords] = useState(() => loadLS(LS_KEYS.ATTEND, []));
  
  useEffect(() => saveLS(LS_KEYS.STAFF, staff), [staff]);
  useEffect(() => saveLS(LS_KEYS.ATTEND, records), [records]);

  const clockIn = (sid) =>
    setRecords((prev) => [{ id: uid(), staffId: sid, in: new Date().toISOString(), out: "" }, ...prev]);
  
  const clockOut = (rid) =>
    setRecords((prev) => prev.map((r) => (r.id === rid ? { ...r, out: new Date().toISOString() } : r)));

  const addStaff = () =>
    setStaff((prev) => [{ id: uid(), code: `S${100 + prev.length}`, name: "新規", role: "キャスト", active: true }, ...prev]);

  const totalMinutes = (r) => (r.out ? minutesBetween(r.in, r.out) : 0);

  const byStaff = useMemo(() => {
    const map = {};
    records.forEach((r) => {
      map[r.staffId] = (map[r.staffId] || 0) + totalMinutes(r);
    });
    return map;
  }, [records]);

  return e(
    'div',
    { className: "grid md:grid-cols-2 gap-4" },
    e(
      Card,
      {
        title: "スタッフ一覧",
        action: e('button', { className: "px-3 py-1 rounded-xl border", onClick: addStaff }, "追加")
      },
      e(
        'div',
        { className: "space-y-2" },
        staff.map((s) =>
          e(
            'div',
            { key: s.id, className: "flex items-center justify-between rounded-xl border p-2" },
            e(
              'div',
              null,
              e('div', { className: "font-medium" }, s.name, e('span', { className: "text-xs text-gray-500" }, ` (${s.role})`)),
              e('div', { className: "text-xs text-gray-500" }, `コード: ${s.code}`)
            ),
            e(
              'div',
              { className: "flex gap-2" },
              e('button', { className: "px-3 py-1 rounded-xl border", onClick: () => clockIn(s.id) }, "出勤"),
              e(
                'button',
                {
                  className: "px-3 py-1 rounded-xl border",
                  onClick: () => {
                    const open = records.find((r) => r.staffId === s.id && !r.out);
                    if (open) clockOut(open.id);
                  }
                },
                "退勤"
              )
            )
          )
        )
      )
    ),
    e(
      Card,
      { title: "勤怠レコード" },
      e(
        'div',
        { className: "space-y-2 max-h-[500px] overflow-auto pr-1" },
        records.map((r) => {
          const s = staff.find((x) => x.id === r.staffId);
          return e(
            'div',
            { key: r.id, className: "flex items-center justify-between rounded-xl border p-2" },
            e(
              'div',
              null,
              e('div', { className: "font-medium" }, s?.name),
              e('div', { className: "text-xs text-gray-500" }, `${new Date(r.in).toLocaleString()} - ${r.out ? new Date(r.out).toLocaleString() : "(稼働中)"}`)
            ),
            e(
              'div',
              { className: "text-right" },
              e('div', { className: "text-xs text-gray-500" }, "実働(分)"),
              e('div', { className: "font-semibold" }, totalMinutes(r))
            )
          );
        }),
        records.length === 0 && e('div', { className: "text-sm text-gray-500" }, "まだ勤怠がありません。")
      )
    ),
    e(
      Card,
      { title: "集計(本日)" },
      e(
        'div',
        { className: "grid grid-cols-2 gap-3 text-sm" },
        Object.entries(byStaff).map(([sid, mins]) => {
          const s = staff.find((x) => x.id === sid);
          return e(
            'div',
            { key: sid, className: "rounded-xl border p-3" },
            e('div', { className: "font-medium" }, s?.name),
            e('div', { className: "text-gray-500" }, `${Math.round(mins / 60)} 時間`),
            e(
              'div',
              { className: "mt-2 h-2 bg-gray-100 rounded-full overflow-hidden" },
              e('div', { className: "h-2 bg-black", style: { width: `${Math.min(100, (mins / 480) * 100)}%` } })
            )
          );
        }),
        Object.keys(byStaff).length === 0 && e('div', { className: "text-sm text-gray-500" }, "集計対象がありません。")
      )
    )
  );
}

// コンポーネント: Dashboard
function Dashboard() {
  const [tickets] = useState(() => loadLS(LS_KEYS.TICKETS, []));
  const [menu] = useState(() => loadLS(LS_KEYS.MENU, defaultMenu));

  const seriesByDate = useMemo(() => {
    const map = {};
    tickets.forEach((t) => {
      const d = t.date;
      const total = t.items.reduce((a, c) => a + (c.price || 0) * (c.qty || 1), 0);
      map[d] = (map[d] || 0) + total;
    });
    return Object.entries(map)
      .map(([date, total]) => ({ date, total }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [tickets]);

  const topMenu = useMemo(() => {
    const map = {};
    tickets.forEach((t) => {
      t.items.forEach((i) => (map[i.name] = (map[i.name] || 0) + (i.qty || 1)));
    });
    return Object.entries(map)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [tickets]);

  const totalSales = seriesByDate.reduce((a, c) => a + c.total, 0);
  const totalCovers = tickets.length;
  const avgCheck = totalCovers ? Math.round(totalSales / totalCovers) : 0;

  return e(
    'div',
    { className: "grid md:grid-cols-3 gap-4" },
    e(
      Card,
      { title: "KPI" },
      e(
        'div',
        { className: "grid grid-cols-3 gap-3 text-center" },
        e(
          'div',
          { className: "rounded-2xl border p-3" },
          e('div', { className: "text-xs text-gray-500" }, "売上累計"),
          e('div', { className: "text-xl font-semibold" }, `¥${currency(totalSales)}`)
        ),
        e(
          'div',
          { className: "rounded-2xl border p-3" },
          e('div', { className: "text-xs text-gray-500" }, "来客数"),
          e('div', { className: "text-xl font-semibold" }, totalCovers)
        ),
        e(
          'div',
          { className: "rounded-2xl border p-3" },
          e('div', { className: "text-xs text-gray-500" }, "客単価"),
          e('div', { className: "text-xl font-semibold" }, `¥${currency(avgCheck)}`)
        )
      )
    ),
    e(
      Card,
      { title: "日次売上(簡易チャート)" },
      e(
        'div',
        { className: "h-48 flex items-end gap-1" },
        seriesByDate.map((p) =>
          e(
            'div',
            { key: p.date, className: "flex-1 flex flex-col items-center" },
            e('div', { className: "w-full bg-black rounded-t", style: { height: `${Math.min(100, (p.total / (avgCheck * 5 || 1)) * 100)}%` } }),
            e('div', { className: "text-[10px] text-gray-500 mt-1" }, p.date.slice(5))
          )
        ),
        seriesByDate.length === 0 && e('div', { className: "text-sm text-gray-500" }, "まだデータがありません。")
      )
    ),
    e(
      Card,
      { title: "人気メニューTop5" },
      e(
        'div',
        { className: "space-y-2" },
        topMenu.map((m, idx) =>
          e(
            'div',
            { key: m.name, className: "flex items-center gap-2" },
            e('div', { className: "w-6 text-right" }, idx + 1),
            e(
              'div',
              { className: "flex-1" },
              e('div', { className: "text-sm font-medium" }, m.name),
              e(
                'div',
                { className: "h-2 bg-gray-100 rounded-full overflow-hidden" },
                e('div', { className: "h-2 bg-black", style: { width: `${Math.min(100, (m.qty / (topMenu[0]?.qty || 1)) * 100)}%` } })
              )
            ),
            e('div', { className: "w-10 text-right text-sm" }, m.qty)
          )
        ),
        topMenu.length === 0 && e('div', { className: "text-sm text-gray-500" }, "データなし")
      )
    ),
    e(
      Card,
      { title: "メニューマスタ(JSON)プレビュー" },
      e('pre', { className: "text-xs max-h-64 overflow-auto bg-gray-50 p-3 rounded-xl" }, JSON.stringify(menu, null, 2))
    ),
    e(
      Card,
      { title: `直近伝票(件数: ${tickets.length})` },
      e(
        'div',
        { className: "max-h-64 overflow-auto pr-1 text-sm space-y-2" },
        tickets.slice(0, 10).map((t) =>
          e(
            'div',
            { key: t.id, className: "rounded-xl border p-2" },
            e(
              'div',
              { className: "flex justify-between" },
              e('span', null, `${t.date} ${t.customer || "無名"}`),
              e('span', null, `¥${currency(t.items.reduce((a, c) => a + (c.price || 0) * (c.qty || 1), 0))}`)
            ),
            e('div', { className: "text-xs text-gray-500" }, t.items.map((i) => `${i.name}×${i.qty}`).join(" / "))
          )
        ),
        tickets.length === 0 && e('div', { className: "text-sm text-gray-500" }, "まだ伝票がありません。")
      )
    )
  );
}

// コンポーネント: Settings
function Settings() {
  const [settings, setSettings] = useState(() => loadLS(LS_KEYS.SETTINGS, defaultSettings));
  
  useEffect(() => saveLS(LS_KEYS.SETTINGS, settings), [settings]);

  const schema = {
    fields: [
      { key: "storeName", label: "店舗名" },
      { key: "currency", label: "通貨" },
      { key: "receiptFooter", label: "レシートフッター" },
    ],
  };

  return e(
    Card,
    { title: "店舗設定" },
    e(DynamicForm, {
      schema: schema,
      value: settings,
      onChange: setSettings,
      onSubmit: () => {},
      submitLabel: "OK"
    })
  );
}

// ナビゲーション定義
const NAVS = [
  { key: "ticket", label: "伝票登録" },
  { key: "menu", label: "メニュー管理" },
  { key: "att", label: "勤怠管理" },
  { key: "dash", label: "ダッシュボード" },
  { key: "settings", label: "設定" },
];

// メインAppコンポーネント
function App() {
  const [nav, setNav] = useState("ticket");

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("bg-gray-100");
  }, []);

  return e(
    'div',
    { className: "min-h-screen p-4 md:p-6" },
    e(
      'div',
      { className: "max-w-7xl mx-auto space-y-4" },
      e(
        'header',
        { className: "flex items-center justify-between" },
        e(
          'div',
          { className: "flex items-center gap-3" },
          e('div', { className: "logo-mark" }, "ア"),
          e(
            'div',
            null,
            e('div', { className: "text-xl font-bold" }, "Night+ 会計"),
            e('div', { className: "text-xs text-gray-500" }, "JSON駆動 / ローカル保存")
          )
        ),
        e(
          'nav',
          { className: "flex gap-2" },
          NAVS.map((n) =>
            e(Pill, { key: n.key, active: nav === n.key, onClick: () => setNav(n.key) }, n.label)
          )
        )
      ),
      e(
        'main',
        { className: "space-y-4 fade-in", key: nav },
        nav === "ticket" && e(TicketEntry),
        nav === "menu" && e(MenuMaster),
        nav === "att" && e(Attendance),
        nav === "dash" && e(Dashboard),
        nav === "settings" && e(Settings)
      ),
      e(
        'footer',
        { className: "text-center text-xs text-gray-500 pt-6" },
        `© ${new Date().getFullYear()} Night+ — Demo. ブラウザのローカルストレージに保存されます。`
      )
    )
  );
}

// アプリケーションのレンダリング
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(e(App));