"use client";

import { Handshake, Shield } from "lucide-react";
import { Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch } from "@/lib/api";
import { getInitials } from "@/lib/format";

type Partner = {
  id: string;
  type: string;
  name: string;
  phone: string | null;
  email: string | null;
  city: string | null;
  verified: boolean;
};

type PartnerListResponse = {
  data: Partner[];
  total: number;
  hasMore: boolean;
};

function toPartnerRows(input: unknown): Partner[] {
  if (!Array.isArray(input)) return [];
  return input.filter(
    (p): p is Partner =>
      typeof p === "object" &&
      p !== null &&
      typeof (p as { id?: unknown }).id === "string" &&
      typeof (p as { type?: unknown }).type === "string" &&
      typeof (p as { name?: unknown }).name === "string" &&
      ((p as { phone?: unknown }).phone == null || typeof (p as { phone?: unknown }).phone === "string") &&
      ((p as { email?: unknown }).email == null || typeof (p as { email?: unknown }).email === "string") &&
      ((p as { city?: unknown }).city == null || typeof (p as { city?: unknown }).city === "string") &&
      typeof (p as { verified?: unknown }).verified === "boolean",
  );
}

export default function PartnersPage() {
  const { token } = useAuth();
  const [rows, setRows] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    type: "legal",
    name: "",
    phone: "",
    email: "",
    city: "",
  });
  const [editForm, setEditForm] = useState({
    type: "legal",
    name: "",
    phone: "",
    email: "",
    city: "",
  });

  const load = useCallback(async () => {
    if (!token) {
      setRows([]);
      return;
    }
    setLoading(true);
    try {
      const response = await apiFetch<PartnerListResponse>("/partners", { token });
      setRows(toPartnerRows(response?.data));
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    await apiFetch("/partners", {
      method: "POST",
      token,
      body: JSON.stringify({
        type: form.type,
        name: form.name,
        phone: form.phone || undefined,
        email: form.email || undefined,
        city: form.city || undefined,
      }),
    });
    setForm((f) => ({ ...f, name: "", phone: "", email: "", city: "" }));
    await load();
  }

  function startEdit(row: Partner) {
    setEditingId(row.id);
    setEditForm({
      type: row.type || "legal",
      name: row.name || "",
      phone: row.phone || "",
      email: row.email || "",
      city: row.city || "",
    });
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !editingId) return;
    setBusyId(editingId);
    try {
      await apiFetch(`/partners/${editingId}`, {
        method: "PATCH",
        token,
        body: JSON.stringify({
          type: editForm.type,
          name: editForm.name,
          phone: editForm.phone || undefined,
          email: editForm.email || undefined,
          city: editForm.city || undefined,
        }),
      });
      setEditingId(null);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function deletePartner(id: string) {
    if (!token) return;
    setBusyId(id);
    try {
      await apiFetch(`/partners/${id}`, { method: "DELETE", token });
      if (editingId === id) setEditingId(null);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="inline-flex items-center gap-2 text-xl font-semibold">
        <Handshake className="h-5 w-5 text-[#00C49A]" />
        Partner network
      </h1>

      <section className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
        <h2 className="text-sm font-medium text-zinc-300">Add partner</h2>
        {token ? (
          <form onSubmit={add} className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <select
              className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            >
              <option value="legal">Legal</option>
              <option value="loan">Loan</option>
              <option value="insurance">Insurance</option>
            </select>
            <input
              required
              placeholder="Partner name"
              className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <input
              placeholder="Phone"
              className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
            <input
              type="email"
              placeholder="Email"
              className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
            <input
              placeholder="City"
              className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 sm:col-span-2"
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            />
            <button type="submit" className="w-fit rounded bg-teal-600 px-3 py-2 text-white">
              Add partner
            </button>
          </form>
        ) : (
          <p className="mt-3 text-sm text-zinc-500">
            <Link href="/login" className="text-teal-400">
              Log in
            </Link>{" "}
            to add partners.
          </p>
        )}
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
        <h2 className="text-sm font-medium text-zinc-300">Partner list</h2>
        {loading ? <p className="mt-3 text-sm text-zinc-500">Loading partners...</p> : null}
        {!loading && rows.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">No partners yet.</p>
        ) : null}
        <ul className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((p) => (
            <li key={p.id} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-xs text-[#00C49A]">
                  {getInitials(p.name)}
                </div>
                <div>
                  <p className="font-semibold text-white">{p.name}</p>
                  <p className="text-xs text-zinc-500">{p.type}</p>
                </div>
                <div className="ml-auto flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => startEdit(p)}
                    className="rounded border border-zinc-700 p-1.5 text-zinc-300 hover:bg-zinc-800"
                    aria-label="Edit partner"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void deletePartner(p.id)}
                    disabled={busyId === p.id}
                    className="rounded border border-red-900/70 p-1.5 text-red-300 hover:bg-red-950/40 disabled:opacity-40"
                    aria-label="Delete partner"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <p className="mt-3 text-xs text-zinc-400">Phone: {p.phone || "—"}</p>
              <p className="text-xs text-zinc-400">Email: {p.email || "—"}</p>
              <p className="text-xs text-zinc-400">City: {p.city || "—"}</p>
              <p className="mt-2 inline-flex items-center gap-1 text-xs text-zinc-400">
                <Shield className="h-3 w-3" />
                {p.verified ? "Verified" : "Pending"}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {editingId ? (
        <section className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
          <h2 className="text-sm font-medium text-zinc-300">Edit partner</h2>
          <form onSubmit={saveEdit} className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <select
              className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
              value={editForm.type}
              onChange={(e) => setEditForm((f) => ({ ...f, type: e.target.value }))}
            >
              <option value="legal">Legal</option>
              <option value="loan">Loan</option>
              <option value="insurance">Insurance</option>
            </select>
            <input
              required
              placeholder="Partner name"
              className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
              value={editForm.name}
              onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
            />
            <input
              placeholder="Phone"
              className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
              value={editForm.phone}
              onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
            />
            <input
              type="email"
              placeholder="Email"
              className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
              value={editForm.email}
              onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
            />
            <input
              placeholder="City"
              className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 sm:col-span-2"
              value={editForm.city}
              onChange={(e) => setEditForm((f) => ({ ...f, city: e.target.value }))}
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={busyId === editingId}
                className="rounded bg-teal-600 px-3 py-2 text-white disabled:opacity-40"
              >
                Save changes
              </button>
              <button
                type="button"
                onClick={() => setEditingId(null)}
                className="rounded border border-zinc-700 px-3 py-2 text-zinc-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      ) : null}
    </div>
  );
}
