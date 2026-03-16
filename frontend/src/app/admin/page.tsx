"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearAdminToken, getAdminToken } from "@/lib/auth";
import type { AllowedUsernameResponse } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function adminFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAdminToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Request failed");
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export default function AdminPage() {
  const router = useRouter();
  const [usernames, setUsernames] = useState<AllowedUsernameResponse[]>([]);
  const [newUsername, setNewUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [deleteError, setDeleteError] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!getAdminToken()) {
      router.replace("/admin/login");
      return;
    }
    loadUsernames();
  }, [router]);

  async function loadUsernames() {
    try {
      const data = await adminFetch<AllowedUsernameResponse[]>("/admin/usernames");
      setUsernames(data);
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes("401")) {
        clearAdminToken();
        router.push("/admin/login");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newUsername.trim()) return;
    setAdding(true);
    setError("");
    try {
      await adminFetch<AllowedUsernameResponse>("/admin/usernames", {
        method: "POST",
        body: JSON.stringify({ username: newUsername.trim() }),
      });
      setNewUsername("");
      await loadUsernames();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add username");
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(username: string) {
    setDeleteError((prev) => ({ ...prev, [username]: "" }));
    try {
      await adminFetch<void>(`/admin/usernames/${encodeURIComponent(username)}`, {
        method: "DELETE",
      });
      setUsernames((prev) => prev.filter((u) => u.username !== username));
    } catch (err: unknown) {
      setDeleteError((prev) => ({
        ...prev,
        [username]: err instanceof Error ? err.message : "Failed to delete",
      }));
    }
  }

  function handleLogout() {
    clearAdminToken();
    router.push("/admin/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Workout Maths</h1>
            <p className="text-sm text-gray-500">Admin Dashboard</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-600 hover:text-red-600 font-medium transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {/* Section header */}
          <div className="px-6 py-5 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800">Allowed Usernames</h2>
            <p className="text-sm text-gray-500 mt-1">
              Students can only sign up with a username that appears on this list.
            </p>
          </div>

          {/* Add form */}
          <div className="px-6 py-5 border-b border-gray-100 bg-gray-50">
            <form onSubmit={handleAdd} className="flex gap-3">
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="Enter username (e.g. alice)"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                required
              />
              <button
                type="submit"
                disabled={adding || !newUsername.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm px-5 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {adding ? "Adding..." : "Add Username"}
              </button>
            </form>
            {error && (
              <p className="text-red-600 text-sm mt-2">{error}</p>
            )}
          </div>

          {/* Table */}
          {loading ? (
            <div className="px-6 py-12 text-center text-gray-400 text-sm">
              Loading...
            </div>
          ) : usernames.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-400 text-sm">
              No allowed usernames yet. Add one above.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Username
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Added
                  </th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {usernames.map((u) => (
                  <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{u.username}</td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(u.created_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div>
                        <button
                          onClick={() => handleDelete(u.username)}
                          className="text-red-500 hover:text-red-700 font-medium text-xs px-3 py-1 rounded-md hover:bg-red-50 transition-colors"
                        >
                          Remove
                        </button>
                        {deleteError[u.username] && (
                          <p className="text-red-500 text-xs mt-1">{deleteError[u.username]}</p>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="px-6 py-4 bg-gray-50 rounded-b-xl">
            <p className="text-xs text-gray-400">
              {usernames.length} username{usernames.length !== 1 ? "s" : ""} in allowed list
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
