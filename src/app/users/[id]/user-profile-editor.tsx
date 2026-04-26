"use client";

import { useState } from "react";
import { Building2, Mail, MapPin, Phone, Plus, Save, Shield, UserCircle2, X } from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";

type EditableUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string | null;
  company: string | null;
  address: string | null;
  avatarUrl: string | null;
};

type UserProfileEditorProps = {
  user: EditableUser;
  canEdit: boolean;
  canAdminEdit: boolean;
};

function formatRole(role: string) {
  return role
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function UserProfileEditor({ user, canEdit, canAdminEdit }: UserProfileEditorProps) {
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone ?? "");
  const [company, setCompany] = useState(user.company ?? "");
  const [address, setAddress] = useState(user.address ?? "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user.avatarUrl);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const refreshPage = () => {
    window.location.reload();
  };

  const saveProfile = async () => {
    setSaving(true);
    setNotice(null);
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          company,
          address,
          avatarUrl,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setNotice(typeof payload.error === "string" ? payload.error : "Unable to save profile.");
        return;
      }
      setNotice("Profile updated.");
      refreshPage();
    } finally {
      setSaving(false);
    }
  };

  const uploadAvatar = async (file: File | null) => {
    if (!file) {
      return;
    }
    const formData = new FormData();
    formData.set("avatar", file);
    const response = await fetch(`/api/users/${user.id}/avatar`, {
      method: "POST",
      body: formData,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setNotice(typeof payload.error === "string" ? payload.error : "Unable to upload photo.");
      return;
    }
    setAvatarUrl(payload.user?.avatarUrl ?? null);
    setNotice("Profile photo updated.");
    refreshPage();
  };

  const removeAvatar = async () => {
    const response = await fetch(`/api/users/${user.id}/avatar`, { method: "DELETE" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setNotice(typeof payload.error === "string" ? payload.error : "Unable to remove photo.");
      return;
    }
    setAvatarUrl(null);
    setNotice("Profile photo removed.");
    refreshPage();
  };

  if (!canEdit) {
    return null;
  }

  return (
    <section className="rounded-[1.5rem] border border-[#e8defd] bg-white p-5 shadow-[0_10px_30px_rgba(180,168,228,0.08)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Edit user profile</h2>
          <p className="mt-1 text-sm text-slate-500">
            Update photo and contact details here. These values are reused across messaging and user views.
          </p>
        </div>
        {canAdminEdit ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
            <Shield className="h-3.5 w-3.5" />
            Admin edit
          </span>
        ) : null}
      </div>

      <div className="mt-5 flex flex-col gap-5 lg:flex-row">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <UserAvatar name={name || user.name} avatarUrl={avatarUrl} size="xl" />
            <label className="absolute -bottom-1 -right-1 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-white bg-[linear-gradient(135deg,#f9d2f5_0%,#d79bf5_45%,#82a8ff_100%)] text-[#2b3159] shadow-sm">
              <Plus className="h-4 w-4" />
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={async (event) => {
                  const file = event.target.files?.[0] ?? null;
                  event.target.value = "";
                  await uploadAvatar(file);
                }}
              />
            </label>
          </div>
          <button
            type="button"
            onClick={() => void removeAvatar()}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            <X className="h-3.5 w-3.5" />
            Remove photo
          </button>
        </div>

        <div className="grid min-w-0 flex-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              <UserCircle2 className="h-3.5 w-3.5" />
              Name
            </span>
            <input value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#c9b6ff]" />
          </label>

          <label className="block">
            <span className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              <Mail className="h-3.5 w-3.5" />
              Email
            </span>
            <input value={user.email} disabled className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500 outline-none" />
          </label>

          <label className="block">
            <span className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              <Phone className="h-3.5 w-3.5" />
              Phone
            </span>
            <input value={phone} onChange={(event) => setPhone(event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#c9b6ff]" />
          </label>

          <label className="block">
            <span className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              <Building2 className="h-3.5 w-3.5" />
              Company
            </span>
            <input value={company} onChange={(event) => setCompany(event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#c9b6ff]" />
          </label>

          <label className="block sm:col-span-2">
            <span className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              <MapPin className="h-3.5 w-3.5" />
              Address
            </span>
            <textarea value={address} onChange={(event) => setAddress(event.target.value)} rows={3} className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#c9b6ff]" />
          </label>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-slate-500">
          Role: <span className="font-semibold text-slate-700">{formatRole(user.role)}</span>
        </div>
        <div className="flex items-center gap-3">
          {notice ? <span className="text-sm font-medium text-slate-600">{notice}</span> : null}
          <button
            type="button"
            onClick={() => void saveProfile()}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#f9d2f5_0%,#d79bf5_45%,#82a8ff_100%)] px-5 py-2 text-sm font-semibold text-[#2b3159] shadow-[0_10px_22px_rgba(196,156,255,0.22)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
    </section>
  );
}
