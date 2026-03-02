"use client"

import { useContext, useEffect, useState } from "react"
import { listUsers, batchUpdateUserRoles, type User } from "~/lib/api"
import { ROLES } from "~/constants"
import { ClipLoader } from "react-spinners"
import { TrashIcon, CheckIcon, Cross2Icon } from "@radix-ui/react-icons"
import { AuthContext } from "~/app/context"

const ALL_ROLES = [ROLES.ADMIN, ROLES.TRADE, ROLES.DATA_MANAGER]

export default function SettingsPage() {
  const { userId: currentUserId } = useContext(AuthContext)
  const [users, setUsers] = useState<User[]>([])
  // Maps userId → target role (queued locally, sent on Save)
  const [pendingRoles, setPendingRoles] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [selectedPending, setSelectedPending] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function fetchUsers() {
      try {
        const data = await listUsers()
        setUsers(data)
      } catch {
        setError("Failed to load users.")
      } finally {
        setLoading(false)
      }
    }
    void fetchUsers()
  }, [])

  const pendingUsers = users.filter((u) => u.role.role === ROLES.PENDING)
  const activeUsers = users.filter((u) => u.role.role !== ROLES.PENDING)

  const hasChanges = Object.keys(pendingRoles).length > 0

  // --- Active users table ---

  function handleRoleChange(
    userId: string,
    originalRole: string,
    newRole: string,
  ) {
    setPendingRoles((prev) => {
      const next = { ...prev }
      if (newRole === originalRole) {
        delete next[userId]
      } else {
        next[userId] = newRole
      }
      return next
    })
  }

  function handleDelete(id: string) {
    setPendingRoles((prev) => {
      const next = { ...prev }
      next[id] = ROLES.DELETED
      return next
    })
  }

  function queuePendingDecision(ids: string[], role: string) {
    setPendingRoles((prev) => {
      const next = { ...prev }
      ids.forEach((id) => {
        next[id] = role
      })
      return next
    })
  }

  function clearPendingDecision(ids: string[]) {
    setPendingRoles((prev) => {
      const next = { ...prev }
      ids.forEach((id) => {
        delete next[id]
      })
      return next
    })
  }

  // --- Save: group by role and send one batch request ---

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const newUsers = await batchUpdateUserRoles(pendingRoles)
      setUsers(newUsers)

      setSelectedPending(new Set())
      setPendingRoles({})
    } catch {
      setError("Failed to save changes.")
    } finally {
      setSaving(false)
    }
  }

  // --- Pending table selection ---

  const allPendingSelected =
    pendingUsers.length > 0 &&
    pendingUsers.every((u) => selectedPending.has(u.id))

  function toggleSelectAll() {
    if (allPendingSelected) {
      setSelectedPending(new Set())
    } else {
      setSelectedPending(new Set(pendingUsers.map((u) => u.id)))
    }
  }

  function toggleSelectOne(id: string) {
    setSelectedPending((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const selectedPendingIds = Array.from(selectedPending)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-800">Settings</h1>
        {hasChanges && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:opacity-50"
          >
            {saving && <ClipLoader color="#ffffff" size={14} />}
            Save changes
          </button>
        )}
      </div>

      {/* Pending Users Table */}
      {!loading && !error && pendingUsers.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-amber-200 bg-white">
          <div className="flex items-center justify-between border-b border-amber-200 bg-amber-50 px-4 py-3">
            <h2 className="text-sm font-medium text-amber-800">
              Pending Requests
              <span className="ml-2 rounded-full bg-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-800">
                {pendingUsers.length}
              </span>
            </h2>
            {selectedPendingIds.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">
                  {selectedPendingIds.length} selected
                </span>
                <button
                  onClick={() =>
                    queuePendingDecision(selectedPendingIds, ROLES.TRADE)
                  }
                  className="flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-700"
                >
                  <CheckIcon className="h-3 w-3" />
                  Accept all
                </button>
                <button
                  onClick={() =>
                    queuePendingDecision(selectedPendingIds, ROLES.DELETED)
                  }
                  className="flex items-center gap-1 rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-700"
                >
                  <Cross2Icon className="h-3 w-3" />
                  Delete all
                </button>
              </div>
            )}
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allPendingSelected}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-slate-700"
                    aria-label="Select all pending users"
                  />
                </th>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pendingUsers.map((user) => {
                const queued = pendingRoles[user.id]
                const isAccepted = queued === ROLES.TRADE
                const isDeleted = queued === ROLES.DELETED
                const isSelected = selectedPending.has(user.id)

                return (
                  <tr
                    key={user.id}
                    onClick={() => toggleSelectOne(user.id)}
                    className={`cursor-pointer transition-colors hover:bg-slate-50 ${
                      isAccepted
                        ? "bg-emerald-50"
                        : isDeleted
                          ? "bg-red-50"
                          : isSelected
                            ? "bg-amber-50"
                            : ""
                    }`}
                  >
                    <td
                      className="px-4 py-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectOne(user.id)}
                        className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-slate-700"
                      />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      {user.id}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-slate-700">{user.email}</span>
                      {isAccepted && (
                        <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          → Trade
                        </span>
                      )}
                      {isDeleted && (
                        <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">
                          → Deleted
                        </span>
                      )}
                    </td>
                    <td
                      className="px-4 py-3 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() =>
                            isAccepted
                              ? clearPendingDecision([user.id])
                              : queuePendingDecision([user.id], ROLES.TRADE)
                          }
                          className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                            isAccepted
                              ? "bg-emerald-600 text-white hover:bg-emerald-700"
                              : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          }`}
                        >
                          <CheckIcon className="h-3 w-3" />
                          Accept
                        </button>
                        <button
                          onClick={() =>
                            isDeleted
                              ? clearPendingDecision([user.id])
                              : queuePendingDecision([user.id], ROLES.DELETED)
                          }
                          className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                            isDeleted
                              ? "bg-red-600 text-white hover:bg-red-700"
                              : "bg-red-50 text-red-600 hover:bg-red-100"
                          }`}
                        >
                          <Cross2Icon className="h-3 w-3" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Active Users Table */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-medium text-slate-700">Users</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <ClipLoader color="#475569" size={28} />
          </div>
        ) : error ? (
          <div className="px-4 py-6 text-sm text-red-500">{error}</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-6 text-center text-slate-400"
                  >
                    No users found.
                  </td>
                </tr>
              ) : (
                activeUsers.map((user) => {
                  const isCurrentUser = user.id === currentUserId
                  const currentRole = pendingRoles[user.id] ?? user.role.role
                  const isPendingDelete =
                    pendingRoles[user.id] === ROLES.DELETED
                  const isDirty = !!pendingRoles[user.id]
                  return (
                    <tr
                      key={user.id}
                      className={`transition-colors ${
                        isPendingDelete ? "bg-red-50" : "hover:bg-slate-50"
                      }`}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">
                        {user.id}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {user.email}
                        {isCurrentUser && (
                          <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                            you
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={currentRole}
                          disabled={isPendingDelete || isCurrentUser}
                          onChange={(e) =>
                            handleRoleChange(
                              user.id,
                              user.role.role,
                              e.target.value,
                            )
                          }
                          className={`rounded-md border px-2.5 py-1 text-xs font-medium outline-none transition-colors focus:ring-2 focus:ring-slate-300 ${
                            isPendingDelete
                              ? "border-red-200 bg-red-50 text-red-400 opacity-70"
                              : isDirty
                                ? "border-amber-300 bg-amber-50 text-amber-700"
                                : "border-slate-200 bg-slate-100 text-slate-600"
                          } ${
                            isCurrentUser ? "cursor-not-allowed opacity-50" : ""
                          }`}
                        >
                          {isPendingDelete ? (
                            <option value={ROLES.DELETED}>
                              {ROLES.DELETED}
                            </option>
                          ) : (
                            ALL_ROLES.map((role) => (
                              <option key={role} value={role}>
                                {role}
                              </option>
                            ))
                          )}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isPendingDelete ? (
                          <button
                            onClick={() =>
                              setPendingRoles((prev) => {
                                const next = { ...prev }
                                delete next[user.id]
                                return next
                              })
                            }
                            className="rounded px-2 py-1 text-xs font-medium text-red-400 transition-colors hover:bg-red-100 hover:text-red-600"
                          >
                            Cancel
                          </button>
                        ) : (
                          <button
                            onClick={() => handleDelete(user.id)}
                            disabled={isCurrentUser}
                            className="rounded p-1 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:pointer-events-none disabled:opacity-30"
                            aria-label="Delete user"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
