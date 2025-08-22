import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * 夜職向け 会計システム（キャバクラ/スナック/ボーイズバー等）
 *  - 伝票登録（入店時間あり、紙伝票ライク）
 *  - メニューマスタ（JSONで保持・編集）
 *  - 売上ダッシュボード
 *  - 勤怠管理
 *  - モダンUI/UX（Tailwind + Framer Motion）
 *  - HTML/CSS/JSのハードコーディングを避けるため、
 *    UIはメタデータ(JSONスキーマ)から動的生成
 *
 * 単一ファイル・ローカルストレージ保存版
 */

/*************************
 * ユーティリティ
 *************************/
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

/*************************
 * データ保存レイヤ（localStorage）
 *************************/
const LS_KEYS = {
  MENU: "nightpos.menu",
  STAFF: "nightpos.staff",
  TICKETS: "nightpos.tickets",
  ATTEND: "nightpos.attendance",
  SETTINGS: "nightpos.settings",
};

const loadLS = (k, fallback) => {
  try {
    const raw = localStorage.getItem(k);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};
const saveLS = (k, v) => localStorage.setItem(k, JSON.stringify(v));

/*************************
 * 初期データ（メニュー/スタッフ/設定）
 *************************/
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
    unitValue: 60, // 60分ごと課金
    pricing: "perUnit", // perUnit | fixed
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
  { id: uid(), code: "S001", name: "アヤ", role: "キャスト", active: true },
  { id: uid(), code: "S002", name: "ミナ", role: "キャスト", active: true },
  { id: uid(), code: "S101", name: "店長", role: "スタッフ", active: true },
];

const defaultSettings = {
  storeName: "Club Night+",
  currency: "JPY",
  receiptFooter: "ご来店ありがとうございました。",
};

/*************************
 * 汎用コンポーネント
 *************************/
function Badge({ children }) {
  return (
    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs">
      {children}
    </span>
  );
}
function Pill({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full border text-sm transition ${
        active ? "bg-black text-white" : "bg-white hover:bg-gray-50"
      }`}
    >
      {children}
    </button>
  );
}
function Card({ title, action, children }) {
  return (
    <div className="rounded-2xl border p-4 shadow-sm bg-white">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">{title}</h3>
        {action}
      </div>
      <div>{children}</div>
    </div>
  );
}

/*************************
 * メタデータ駆動フォーム（ハードコーディング回避）
 *************************/
function DynamicForm({ schema, value, onChange, onSubmit, submitLabel = "保存" }) {
  const [data, setData] = useState(value || {});
  useEffect(() => setData(value || {}), [value]);

  const handle = (k, v) => {
    const next = { ...data, [k]: v };
    setData(next);
    onChange && onChange(next);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit && onSubmit(data);
      }}
      className="grid grid-cols-1 md:grid-cols-2 gap-3"
    >
      {schema.fields.map((f) => (
        <div key={f.key} className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">{f.label}</label>
          {f.type === "select" ? (
            <select
              className="border rounded-xl px-3 py-2"
              value={data[f.key] ?? ""}
              onChange={(e) => handle(f.key, e.target.value)}
            >
              <option value="" disabled>
                選択してください
              </option>
              {f.options?.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : f.type === "number" ? (
            <input
              type="number"
              className="border rounded-xl px-3 py-2"
              value={data[f.key] ?? ""}
              onChange={(e) => handle(f.key, Number(e.target.value))}
              step={f.step || 1}
              min={f.min}
            />
          ) : f.type === "datetime" ? (
            <input
              type="datetime-local"
              className="border rounded-xl px-3 py-2"
              value={data[f.key] ?? ""}
              onChange={(e) => handle(f.key, e.target.value)}
            />
          ) : (
            <input
              type="text"
              className="border rounded-xl px-3 py-2"
              value={data[f.key] ?? ""}
              onChange={(e) => handle(f.key, e.target.value)}
              placeholder={f.placeholder}
            />
          )}
        </div>
      ))}
      <div className="md:col-span-2 flex justify-end gap-2 mt-2">
        {schema.extraActions?.map((btn) => (
          <button
            key={btn.label}
            type="button"
            className="px-4 py-2 rounded-xl border"
            onClick={() => btn.onClick?.(data)}
          >
            {btn.label}
          </button>
        ))}
        <button type="submit" className="px-4 py-2 rounded-xl border bg-black text-white">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

/*************************
 * メニュー管理（JSON保存）
 *************************/
function MenuMaster() {
  const [menu, setMenu] = useState(() => loadLS(LS_KEYS.MENU, defaultMenu));
  const [filter, setFilter] = useState("all");
  useEffect(() => saveLS(LS_KEYS.MENU, menu), [menu]);

  const schema = {
    fields: [
      { key: "code", label: "コード" },
      { key: "name", label: "名称" },
      { key: "category", label: "カテゴリ" },
      { key: "price", label: "単価", type: "number", step: 100 },
      {
        key: "taxRate",
        label: "税率%",
        type: "number",
        step: 1,
      },
      {
        key: "serviceRate",
        label: "サービス%",
        type: "number",
        step: 1,
      },
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

  const [edit, setEdit] = useState(null);

  const filtered = useMemo(
    () =>
      menu.filter((m) => (filter === "all" ? true : m.category === filter)),
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

  return (
    <div className="space-y-4">
      <Card
        title="メニュー登録/編集 (JSON保存)"
        action={
          <div className="flex gap-2">
            {categories.map((c) => (
              <Pill key={c} active={filter === c} onClick={() => setFilter(c)}>
                {c}
              </Pill>
            ))}
            <button
              className="px-3 py-1 rounded-xl border"
              onClick={() => {
                const blob = new Blob([JSON.stringify(menu, null, 2)], {
                  type: "application/json",
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `menu_${Date.now()}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              エクスポート
            </button>
            <label className="px-3 py-1 rounded-xl border cursor-pointer">
              インポート
              <input
                type="file"
                className="hidden"
                accept="application/json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    try {
                      const json = JSON.parse(reader.result);
                      if (Array.isArray(json)) setMenu(json);
                    } catch {}
                  };
                  reader.readAsText(file);
                }}
              />
            </label>
          </div>
        }
      >
        <DynamicForm
          schema={schema}
          value={edit || {}}
          onSubmit={upsert}
          submitLabel={edit ? "更新" : "追加"}
        />
      </Card>

      <div className="grid md:grid-cols-2 gap-3">
        {filtered.map((m) => (
          <motion.div key={m.id} layout>
            <Card
              title={
                <div className="flex items-center gap-2">
                  <span>{m.name}</span>
                  <Badge>{m.category}</Badge>
                </div>
              }
              action={
                <div className="flex gap-2">
                  <button className="px-3 py-1 rounded-xl border" onClick={() => setEdit(m)}>
                    編集
                  </button>
                  <button className="px-3 py-1 rounded-xl border" onClick={() => remove(m.id)}>
                    削除
                  </button>
                </div>
              }
            >
              <div className="text-sm grid grid-cols-2 gap-2">
                <div>コード: {m.code}</div>
                <div>単価: ¥{currency(m.price)}</div>
                <div>税率: {m.taxRate}%</div>
                <div>サービス: {m.serviceRate}%</div>
                <div>単位: {m.unit}</div>
                <div>課金: {m.pricing}</div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/*************************
 * 伝票（紙伝票ライク）
 *************************/
function TicketEntry() {
  const [menu] = useState(() => loadLS(LS_KEYS.MENU, defaultMenu));
  const [tickets, setTickets] = useState(() => loadLS(LS_KEYS.TICKETS, []));
  const [staff] = useState(() => loadLS(LS_KEYS.STAFF, defaultStaff));
  useEffect(() => saveLS(LS_KEYS.TICKETS, tickets), [tickets]);

  const base = {
    id: uid(),
    date: todayISO(),
    customer: "",
    staffId: staff[0]?.id,
    table: "",
    checkin: nowLocal(),
    checkout: "",
    items: [], // {menuId, name, qty, price}
    discount: 0,
    memo: "",
    status: "open", // open | closed
  };
  const [draft, setDraft] = useState(base);

  const menuOpts = menu.filter((m) => m.active).map((m) => ({ value: m.id, label: `${m.name} (¥${m.price})` }));
  const staffOpts = staff.filter((s) => s.active).map((s) => ({ value: s.id, label: s.name }));

  // 伝票計算
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
    setTickets((prev) => [{ ...draft, status: "closed" }, ...prev]);
    setDraft({ ...base, id: uid(), checkin: nowLocal() });
  };

  return (
    <div className="grid lg:grid-cols-5 gap-4">
      {/* 入力パネル */}
      <div className="lg:col-span-3 space-y-3">
        <Card title="伝票 (紙伝票スタイル)">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">来店日</label>
              <input
                type="date"
                className="border rounded-xl px-3 py-2"
                value={draft.date}
                onChange={(e) => setDraft({ ...draft, date: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">担当</label>
              <select
                className="border rounded-xl px-3 py-2"
                value={draft.staffId}
                onChange={(e) => setDraft({ ...draft, staffId: e.target.value })}
              >
                {staffOpts.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">お客様名</label>
              <input
                className="border rounded-xl px-3 py-2"
                value={draft.customer}
                onChange={(e) => setDraft({ ...draft, customer: e.target.value })}
                placeholder="例: 山田様"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">卓/席</label>
              <input
                className="border rounded-xl px-3 py-2"
                value={draft.table}
                onChange={(e) => setDraft({ ...draft, table: e.target.value })}
                placeholder="A-3 など"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">入店</label>
              <input
                type="datetime-local"
                className="border rounded-xl px-3 py-2"
                value={draft.checkin}
                onChange={(e) => setDraft({ ...draft, checkin: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">退店</label>
              <input
                type="datetime-local"
                className="border rounded-xl px-3 py-2"
                value={draft.checkout}
                onChange={(e) => setDraft({ ...draft, checkout: e.target.value })}
              />
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">明細</h4>
              <button className="px-3 py-1 rounded-xl border" onClick={addItem}>
                行追加
              </button>
            </div>
            <div className="rounded-2xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-2 text-left">メニュー</th>
                    <th className="p-2 text-right">数量</th>
                    <th className="p-2 text-right">単価</th>
                    <th className="p-2 text-right">小計</th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {draft.items.map((it) => {
                    const m = menu.find((x) => x.id === it.menuId) || {};
                    const qty = it.qty ?? 1;
                    const unitPrice = m.price ?? 0;
                    const rowSub = unitPrice * qty;
                    return (
                      <tr key={it.id} className="border-t">
                        <td className="p-2">
                          <select
                            className="border rounded-lg px-2 py-1 w-full"
                            value={it.menuId}
                            onChange={(e) => {
                              const mId = e.target.value;
                              const mm = menu.find((x) => x.id === mId);
                              setItem(it.id, {
                                menuId: mId,
                                name: mm?.name,
                                price: mm?.price,
                              });
                            }}
                          >
                            {menuOpts.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2 text-right">
                          <input
                            type="number"
                            className="border rounded-lg px-2 py-1 w-24 text-right"
                            value={qty}
                            min={1}
                            onChange={(e) => setItem(it.id, { qty: Number(e.target.value) })}
                          />
                        </td>
                        <td className="p-2 text-right">¥{currency(unitPrice)}</td>
                        <td className="p-2 text-right">¥{currency(rowSub)}</td>
                        <td className="p-2 text-right">
                          <button className="px-3 py-1 rounded-xl border" onClick={() => removeItem(it.id)}>
                            削除
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {draft.items.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-gray-500">
                        明細がありません。「行追加」から追加してください。
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 items-start">
            <div>
              <label className="text-xs text-gray-500">メモ</label>
              <textarea
                className="border rounded-xl px-3 py-2 w-full h-24"
                value={draft.memo}
                onChange={(e) => setDraft({ ...draft, memo: e.target.value })}
              />
            </div>
            <div className="rounded-2xl border p-3 bg-gray-50">
              <div className="flex justify-between text-sm">
                <span>在店時間</span>
                <span>{totals.mins} 分</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>小計</span>
                <span>¥{currency(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>サービス料</span>
                <span>¥{currency(totals.service)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>消費税</span>
                <span>¥{currency(totals.tax)}</span>
              </div>
              <div className="flex justify-between items-center text-sm mt-2">
                <span>値引き</span>
                <input
                  type="number"
                  className="border rounded-lg px-2 py-1 w-28 text-right"
                  value={draft.discount}
                  min={0}
                  onChange={(e) => setDraft({ ...draft, discount: Number(e.target.value) })}
                />
              </div>
              <div className="mt-3 flex justify-between font-semibold text-lg">
                <span>合計</span>
                <span>¥{currency(totals.total)}</span>
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <button className="px-4 py-2 rounded-xl border" onClick={() => setDraft(base)}>
                  クリア
                </button>
                <button className="px-4 py-2 rounded-xl border bg-black text-white" onClick={saveTicket}>
                  伝票確定
                </button>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* 直近伝票 */}
      <div className="lg:col-span-2 space-y-3">
        <Card title="直近の伝票">
          <div className="space-y-2 max-h-[600px] overflow-auto pr-1">
            {tickets.map((t) => (
              <div key={t.id} className="rounded-xl border p-3">
                <div className="flex justify-between text-sm">
                  <div>
                    <div className="font-medium">{t.customer || "無名"}</div>
                    <div className="text-gray-500">{t.date} / 席 {t.table || "-"}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">合計</div>
                    <div className="font-semibold">¥{currency(t.items.reduce((a, c) => a + (c.price || 0) * (c.qty || 1), 0))}</div>
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-600">
                  {t.items.map((i) => (
                    <span key={i.id} className="mr-2">{i.name}×{i.qty}</span>
                  ))}
                </div>
              </div>
            ))}
            {tickets.length === 0 && (
              <div className="text-sm text-gray-500">まだ伝票がありません。</div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

/*************************
 * 勤怠管理
 *************************/
function Attendance() {
  const [staff, setStaff] = useState(() => loadLS(LS_KEYS.STAFF, defaultStaff));
  const [records, setRecords] = useState(() => loadLS(LS_KEYS.ATTEND, []));
  useEffect(() => saveLS(LS_KEYS.STAFF, staff), [staff]);
  useEffect(() => saveLS(LS_KEYS.ATTEND, records), [records]);

  const clockIn = (sid) =>
    setRecords((prev) => [{ id: uid(), staffId: sid, in: new Date().toISOString(), out: "" }, ...prev]);
  const clockOut = (rid) =>
    setRecords((prev) => prev.map((r) => (r.id === rid ? { ...r, out: new Date().toISOString() } : r)));

  const addStaff = () => setStaff((prev) => [{ id: uid(), code: `S${100 + prev.length}`, name: "新規", role: "キャスト", active: true }, ...prev]);

  const totalMinutes = (r) => (r.out ? minutesBetween(r.in, r.out) : 0);

  const byStaff = useMemo(() => {
    const map = {};
    records.forEach((r) => {
      map[r.staffId] = (map[r.staffId] || 0) + totalMinutes(r);
    });
    return map;
  }, [records]);

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card title="スタッフ一覧" action={<button className="px-3 py-1 rounded-xl border" onClick={addStaff}>追加</button>}>
        <div className="space-y-2">
          {staff.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-xl border p-2">
              <div>
                <div className="font-medium">{s.name} <span className="text-xs text-gray-500">({s.role})</span></div>
                <div className="text-xs text-gray-500">コード: {s.code}</div>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1 rounded-xl border" onClick={() => clockIn(s.id)}>出勤</button>
                <button
                  className="px-3 py-1 rounded-xl border"
                  onClick={() => {
                    const open = records.find((r) => r.staffId === s.id && !r.out);
                    if (open) clockOut(open.id);
                  }}
                >
                  退勤
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="勤怠レコード">
        <div className="space-y-2 max-h-[500px] overflow-auto pr-1">
          {records.map((r) => {
            const s = staff.find((x) => x.id === r.staffId);
            return (
              <div key={r.id} className="flex items-center justify-between rounded-xl border p-2">
                <div>
                  <div className="font-medium">{s?.name}</div>
                  <div className="text-xs text-gray-500">{new Date(r.in).toLocaleString()} - {r.out ? new Date(r.out).toLocaleString() : "(稼働中)"}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">実働(分)</div>
                  <div className="font-semibold">{totalMinutes(r)}</div>
                </div>
              </div>
            );
          })}
          {records.length === 0 && <div className="text-sm text-gray-500">まだ勤怠がありません。</div>}
        </div>
      </Card>

      <Card title="集計(本日)">
        <div className="grid grid-cols-2 gap-3 text-sm">
          {Object.entries(byStaff).map(([sid, mins]) => {
            const s = staff.find((x) => x.id === sid);
            return (
              <div key={sid} className="rounded-xl border p-3">
                <div className="font-medium">{s?.name}</div>
                <div className="text-gray-500">{Math.round(mins / 60)} 時間</div>
                <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-2 bg-black" style={{ width: `${Math.min(100, (mins / 480) * 100)}%` }} />
                </div>
              </div>
            );
          })}
          {Object.keys(byStaff).length === 0 && <div className="text-sm text-gray-500">集計対象がありません。</div>}
        </div>
      </Card>
    </div>
  );
}

/*************************
 * 売上ダッシュボード
 *************************/
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

  return (
    <div className="grid md:grid-cols-3 gap-4">
      <Card title="KPI">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-2xl border p-3">
            <div className="text-xs text-gray-500">売上累計</div>
            <div className="text-xl font-semibold">¥{currency(totalSales)}</div>
          </div>
          <div className="rounded-2xl border p-3">
            <div className="text-xs text-gray-500">来客数</div>
            <div className="text-xl font-semibold">{totalCovers}</div>
          </div>
          <div className="rounded-2xl border p-3">
            <div className="text-xs text-gray-500">客単価</div>
            <div className="text-xl font-semibold">¥{currency(avgCheck)}</div>
          </div>
        </div>
      </Card>

      <Card title="日次売上(簡易チャート)" >
        <div className="h-48 flex items-end gap-1">
          {seriesByDate.map((p) => (
            <div key={p.date} className="flex-1 flex flex-col items-center">
              <div className="w-full bg-black rounded-t" style={{ height: `${Math.min(100, (p.total / (avgCheck * 5 || 1)) * 100)}%` }} />
              <div className="text-[10px] text-gray-500 mt-1">{p.date.slice(5)}</div>
            </div>
          ))}
          {seriesByDate.length === 0 && (
            <div className="text-sm text-gray-500">まだデータがありません。</div>
          )}
        </div>
      </Card>

      <Card title="人気メニューTop5">
        <div className="space-y-2">
          {topMenu.map((m, idx) => (
            <div key={m.name} className="flex items-center gap-2">
              <div className="w-6 text-right">{idx + 1}</div>
              <div className="flex-1">
                <div className="text-sm font-medium">{m.name}</div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-2 bg-black" style={{ width: `${Math.min(100, (m.qty / (topMenu[0]?.qty || 1)) * 100)}%` }} />
                </div>
              </div>
              <div className="w-10 text-right text-sm">{m.qty}</div>
            </div>
          ))}
          {topMenu.length === 0 && <div className="text-sm text-gray-500">データなし</div>}
        </div>
      </Card>

      <Card title="メニューマスタ(JSON)プレビュー" >
        <pre className="text-xs max-h-64 overflow-auto bg-gray-50 p-3 rounded-xl">{JSON.stringify(menu, null, 2)}</pre>
      </Card>

      <Card title="直近伝票(件数: {tickets.length})" >
        <div className="max-h-64 overflow-auto pr-1 text-sm space-y-2">
          {tickets.slice(0, 10).map((t) => (
            <div key={t.id} className="rounded-xl border p-2">
              <div className="flex justify-between"><span>{t.date} {t.customer || "無名"}</span><span>¥{currency(t.items.reduce((a, c) => a + (c.price || 0) * (c.qty || 1), 0))}</span></div>
              <div className="text-xs text-gray-500">{t.items.map((i) => `${i.name}×${i.qty}`).join(" / ")}</div>
            </div>
          ))}
          {tickets.length === 0 && <div className="text-sm text-gray-500">まだ伝票がありません。</div>}
        </div>
      </Card>
    </div>
  );
}

/*************************
 * 設定
 *************************/
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

  return (
    <Card title="店舗設定">
      <DynamicForm
        schema={schema}
        value={settings}
        onChange={setSettings}
        onSubmit={() => {}}
        submitLabel="OK"
      />
    </Card>
  );
}

/*************************
 * ナビ/ページ
 *************************/
const NAVS = [
  { key: "ticket", label: "伝票登録" },
  { key: "menu", label: "メニュー管理" },
  { key: "att", label: "勤怠管理" },
  { key: "dash", label: "ダッシュボード" },
  { key: "settings", label: "設定" },
];

export default function App() {
  const [nav, setNav] = useState("ticket");

  useEffect(() => {
    // Tailwindのベース
    const root = document.documentElement;
    root.classList.add("bg-gray-100");
  }, []);

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-black" />
            <div>
              <div className="text-xl font-bold">Night+ 会計</div>
              <div className="text-xs text-gray-500">JSON駆動 / ローカル保存</div>
            </div>
          </div>
          <nav className="flex gap-2">
            {NAVS.map((n) => (
              <Pill key={n.key} active={nav === n.key} onClick={() => setNav(n.key)}>
                {n.label}
              </Pill>
            ))}
          </nav>
        </header>

        <AnimatePresence mode="wait">
          <motion.main
            key={nav}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {nav === "ticket" && <TicketEntry />}
            {nav === "menu" && <MenuMaster />}
            {nav === "att" && <Attendance />}
            {nav === "dash" && <Dashboard />}
            {nav === "settings" && <Settings />}
          </motion.main>
        </AnimatePresence>

        <footer className="text-center text-xs text-gray-500 pt-6">
          © {new Date().getFullYear()} Night+ — Demo. ブラウザのローカルストレージに保存されます。
        </footer>
      </div>
    </div>
  );
}
