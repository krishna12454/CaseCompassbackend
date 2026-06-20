import React, {useEffect, useMemo, useState} from "react";
import {useNavigate} from "react-router-dom";
import {useTranslation} from "react-i18next";
import api from "@/services/api.ts";
import {Button} from "@/components/ui/button.tsx";
import {Input} from "@/components/ui/input.tsx";
import {useToast} from "@/components/ui/use-toast.ts";

type Priority = "low" | "medium" | "high" | "urgent";
type Status = "pending" | "in_progress" | "completed";

interface Task {
    task_id: number;
    case: number;
    case_id: number;
    title: string;
    description: string | null;
    priority: Priority;
    status: Status;
    due_date: string | null;
    responsible: number | null;
    responsible_name: string | null;
    created_by: number | null;
    created_by_name: string | null;
    created_at: string;
    updated_at: string;
}

interface CaseLite {
    case_id: number;
    affected_name?: string;
}

interface UserLite {
    id: number;
    username: string;
    name?: string;
    surname?: string;
}

const PRIORITY_ORDER: Record<Priority, number> = {urgent: 0, high: 1, medium: 2, low: 3};
const PRIORITY_COLOR: Record<Priority, string> = {
    urgent: "bg-red-100 text-red-800 border-red-300",
    high: "bg-orange-100 text-orange-800 border-orange-300",
    medium: "bg-yellow-100 text-yellow-800 border-yellow-300",
    low: "bg-green-100 text-green-800 border-green-300",
};
const STATUS_COLOR: Record<Status, string> = {
    pending: "bg-gray-100 text-gray-800 border-gray-300",
    in_progress: "bg-blue-100 text-blue-800 border-blue-300",
    completed: "bg-emerald-100 text-emerald-800 border-emerald-300",
};

const emptyForm = {
    case: 0,
    title: "",
    description: "",
    priority: "medium" as Priority,
    status: "pending" as Status,
    due_date: "",
    responsible: null as number | null,
};

const TasksPage: React.FC = () => {
    const {t} = useTranslation();
    const {toast} = useToast();
    const navigate = useNavigate();

    const [tasks, setTasks] = useState<Task[]>([]);
    const [cases, setCases] = useState<CaseLite[]>([]);
    const [users, setUsers] = useState<UserLite[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<"all" | Status>("all");

    const [showDialog, setShowDialog] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [form, setForm] = useState({...emptyForm});

    useEffect(() => {
        loadAll();
    }, []);

    const loadAll = async () => {
        setLoading(true);
        try {
            const [tasksRes, casesRes, usersRes] = await Promise.all([
                api.get("tasks/"),
                api.get("case/"),
                api.get("auth/users/"),
            ]);
            setTasks(tasksRes.data || []);
            setCases(casesRes.data || []);
            setUsers(usersRes.data || []);
        } catch (e) {
            console.error(e);
            toast({variant: "destructive", title: t("error"), description: "Failed to load tasks"});
        } finally {
            setLoading(false);
        }
    };

    const filteredAndSorted = useMemo(() => {
        const filtered = filter === "all" ? tasks : tasks.filter((task) => task.status === filter);
        return [...filtered].sort((a, b) => {
            if (a.status === "completed" && b.status !== "completed") return 1;
            if (b.status === "completed" && a.status !== "completed") return -1;
            const pa = PRIORITY_ORDER[a.priority];
            const pb = PRIORITY_ORDER[b.priority];
            if (pa !== pb) return pa - pb;
            if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
            if (a.due_date) return -1;
            if (b.due_date) return 1;
            return 0;
        });
    }, [tasks, filter]);

    const openCreate = () => {
        setEditingId(null);
        setForm({...emptyForm, case: cases[0]?.case_id || 0});
        setShowDialog(true);
    };

    const openEdit = (task: Task) => {
        setEditingId(task.task_id);
        setForm({
            case: task.case,
            title: task.title,
            description: task.description || "",
            priority: task.priority,
            status: task.status,
            due_date: task.due_date ? task.due_date.slice(0, 16) : "",
            responsible: task.responsible,
        });
        setShowDialog(true);
    };

    const handleSubmit = async () => {
        if (!form.title.trim()) {
            toast({variant: "destructive", title: t("error"), description: "Title is required"});
            return;
        }
        if (!form.case) {
            toast({variant: "destructive", title: t("error"), description: "Please select a case"});
            return;
        }
        const payload = {
            case: form.case,
            title: form.title.trim(),
            description: form.description.trim() || null,
            priority: form.priority,
            status: form.status,
            due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
            responsible: form.responsible || null,
        };
        try {
            if (editingId) {
                await api.put(`tasks/${editingId}/`, payload);
                toast({title: t("success"), description: "Task updated"});
            } else {
                await api.post("tasks/", payload);
                toast({title: t("success"), description: "Task created"});
            }
            setShowDialog(false);
            await loadAll();
        } catch (e) {
            console.error(e);
            toast({variant: "destructive", title: t("error"), description: "Failed to save task"});
        }
    };

    const quickComplete = async (task: Task) => {
        try {
            await api.put(`tasks/${task.task_id}/`, {
                case: task.case,
                title: task.title,
                description: task.description,
                priority: task.priority,
                status: "completed",
                due_date: task.due_date,
                responsible: task.responsible,
            });
            await loadAll();
        } catch (e) {
            console.error(e);
            toast({variant: "destructive", title: t("error"), description: "Failed to update status"});
        }
    };

    const deleteTask = async (task: Task) => {
        if (!confirm(`Delete task "${task.title}"?`)) return;
        try {
            await api.delete(`tasks/${task.task_id}/`);
            toast({title: t("success"), description: "Task deleted"});
            await loadAll();
        } catch (e) {
            console.error(e);
            toast({variant: "destructive", title: t("error"), description: "Failed to delete task"});
        }
    };

    const caseLabel = (id: number) => {
        const c = cases.find((x) => x.case_id === id);
        return c?.affected_name ? `#${id} – ${c.affected_name}` : `#${id}`;
    };

    return (
        <div className="container mx-auto px-4 py-6" style={{marginTop: "70px"}} data-testid="tasks-page">
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold">{t("tasks") || "Tasks"}</h1>
                <Button onClick={openCreate} data-testid="task-create-btn">
                    + {t("newTask") || "New Task"}
                </Button>
            </div>

            {/* Filter pills */}
            <div className="flex gap-2 mb-4">
                {(["all", "pending", "in_progress", "completed"] as const).map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-3 py-1 rounded-full text-sm border ${
                            filter === f
                                ? "bg-slate-800 text-white border-slate-800"
                                : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                        }`}
                        data-testid={`task-filter-${f}`}
                    >
                        {f === "all" ? t("all") || "All" : t(f) || f.replace("_", " ")}
                        {f !== "all" && ` (${tasks.filter((task) => task.status === f).length})`}
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="bg-white border rounded-lg overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-slate-500">Loading...</div>
                ) : filteredAndSorted.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">
                        {filter === "all" ? "No tasks yet. Create your first one!" : `No ${filter.replace("_", " ")} tasks`}
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b">
                        <tr className="text-left">
                            <th className="px-4 py-3 w-10"></th>
                            <th className="px-4 py-3">{t("title") || "Title"}</th>
                            <th className="px-4 py-3">{t("case") || "Case"}</th>
                            <th className="px-4 py-3">{t("priority") || "Priority"}</th>
                            <th className="px-4 py-3">{t("status") || "Status"}</th>
                            <th className="px-4 py-3">{t("dueDate") || "Due"}</th>
                            <th className="px-4 py-3">{t("responsible") || "Responsible"}</th>
                            <th className="px-4 py-3 w-32 text-right">{t("actions") || "Actions"}</th>
                        </tr>
                        </thead>
                        <tbody>
                        {filteredAndSorted.map((task) => {
                            const overdue =
                                task.due_date &&
                                task.status !== "completed" &&
                                new Date(task.due_date) < new Date();
                            return (
                                <tr key={task.task_id} className="border-b hover:bg-slate-50">
                                    <td className="px-4 py-3">
                                        <input
                                            type="checkbox"
                                            checked={task.status === "completed"}
                                            onChange={() => quickComplete(task)}
                                            disabled={task.status === "completed"}
                                            data-testid={`task-complete-${task.task_id}`}
                                        />
                                    </td>
                                    <td className={`px-4 py-3 font-medium ${task.status === "completed" ? "line-through text-slate-400" : ""}`}>
                                        {task.title}
                                        {task.description && (
                                            <div className="text-xs text-slate-500 mt-0.5">{task.description}</div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <button
                                            className="text-blue-600 hover:underline"
                                            onClick={() => navigate(`/case/${task.case}`)}
                                        >
                                            {caseLabel(task.case)}
                                        </button>
                                    </td>
                                    <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded-full text-xs border ${PRIORITY_COLOR[task.priority]}`}>
                                                {task.priority}
                                            </span>
                                    </td>
                                    <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded-full text-xs border ${STATUS_COLOR[task.status]}`}>
                                                {task.status.replace("_", " ")}
                                            </span>
                                    </td>
                                    <td className={`px-4 py-3 ${overdue ? "text-red-600 font-semibold" : ""}`}>
                                        {task.due_date ? new Date(task.due_date).toLocaleString() : "—"}
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">{task.responsible_name || "—"}</td>
                                    <td className="px-4 py-3 text-right space-x-2">
                                        <button
                                            className="text-blue-600 hover:underline"
                                            onClick={() => openEdit(task)}
                                            data-testid={`task-edit-${task.task_id}`}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            className="text-red-600 hover:underline"
                                            onClick={() => deleteTask(task)}
                                            data-testid={`task-delete-${task.task_id}`}
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Dialog */}
            {showDialog && (
                <div
                    className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
                    onClick={() => setShowDialog(false)}
                >
                    <div
                        className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6"
                        onClick={(e) => e.stopPropagation()}
                        data-testid="task-dialog"
                    >
                        <h2 className="text-lg font-semibold mb-4">
                            {editingId ? "Edit Task" : "New Task"}
                        </h2>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium mb-1">Title *</label>
                                <Input
                                    value={form.title}
                                    onChange={(e) => setForm({...form, title: e.target.value})}
                                    placeholder="e.g. Call the lawyer"
                                    data-testid="task-title-input"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Case *</label>
                                <select
                                    className="w-full border rounded px-3 py-2"
                                    value={form.case}
                                    onChange={(e) => setForm({...form, case: Number(e.target.value)})}
                                    data-testid="task-case-select"
                                >
                                    <option value={0}>-- Select a case --</option>
                                    {cases.map((c) => (
                                        <option key={c.case_id} value={c.case_id}>
                                            {caseLabel(c.case_id)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Priority</label>
                                    <select
                                        className="w-full border rounded px-3 py-2"
                                        value={form.priority}
                                        onChange={(e) => setForm({...form, priority: e.target.value as Priority})}
                                        data-testid="task-priority-select"
                                    >
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                        <option value="urgent">Urgent</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">Status</label>
                                    <select
                                        className="w-full border rounded px-3 py-2"
                                        value={form.status}
                                        onChange={(e) => setForm({...form, status: e.target.value as Status})}
                                        data-testid="task-status-select"
                                    >
                                        <option value="pending">Pending</option>
                                        <option value="in_progress">In Progress</option>
                                        <option value="completed">Completed</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Due Date</label>
                                <Input
                                    type="datetime-local"
                                    value={form.due_date}
                                    onChange={(e) => setForm({...form, due_date: e.target.value})}
                                    data-testid="task-duedate-input"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Responsible</label>
                                <select
                                    className="w-full border rounded px-3 py-2"
                                    value={form.responsible ?? ""}
                                    onChange={(e) => setForm({...form, responsible: e.target.value ? Number(e.target.value) : null})}
                                    data-testid="task-responsible-select"
                                >
                                    <option value="">-- Unassigned --</option>
                                    {users.map((u) => (
                                        <option key={u.id} value={u.id}>
                                            {u.name && u.surname ? `${u.name} ${u.surname}` : u.username}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Description</label>
                                <textarea
                                    className="w-full border rounded px-3 py-2 min-h-[80px]"
                                    value={form.description}
                                    onChange={(e) => setForm({...form, description: e.target.value})}
                                    placeholder="Optional details..."
                                    data-testid="task-description-input"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-5">
                            <Button
                                variant="outline"
                                onClick={() => setShowDialog(false)}
                                data-testid="task-dialog-cancel"
                            >
                                Cancel
                            </Button>
                            <Button onClick={handleSubmit} data-testid="task-dialog-submit">
                                {editingId ? "Save" : "Create"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TasksPage;
