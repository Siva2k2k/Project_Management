import { useState, useEffect } from 'react';
import { Plus, Search, Pencil, Trash2, KeyRound, ToggleLeft, ToggleRight } from 'lucide-react';
import { userService, type User } from '../../services';
import type { UserListParams } from '../../services/userService';
import {
  Button,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Pagination,
} from '../../components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/Select';
import { UserDialog } from './UserDialog';
import { UserRole } from '../../types/auth';

export function ManageUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; user: User | null }>({
    open: false,
    user: null,
  });
  const [resetPasswordDialog, setResetPasswordDialog] = useState<{ open: boolean; user: User | null }>({
    open: false,
    user: null,
  });

  const limit = 6;

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params: UserListParams = {
        page,
        limit,
        search: search || undefined,
        sort: 'name',
        order: 'asc',
      };

      if (roleFilter !== 'all') {
        params.role = roleFilter;
      }

      if (statusFilter !== 'all') {
        params.is_active = statusFilter === 'active';
      }

      const response = await userService.listUsers(params);
      setUsers(response.data);
      setTotal(response.total);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, search, roleFilter, statusFilter]);

  const handleCreate = () => {
    setSelectedUser(null);
    setDialogOpen(true);
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteDialog.user) return;

    try {
      await userService.deleteUser(deleteDialog.user._id);
      setDeleteDialog({ open: false, user: null });
      fetchUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  const handleResetPassword = async () => {
    if (!resetPasswordDialog.user) return;

    try {
      await userService.resetUserPassword(resetPasswordDialog.user._id);
      setResetPasswordDialog({ open: false, user: null });
      alert('Password reset email sent successfully!');
    } catch (error) {
      console.error('Failed to reset password:', error);
      alert('Failed to send password reset email');
    }
  };

  const handleStatusToggle = async (user: User) => {
    try {
      if (user.is_active) {
        await userService.deactivateUser(user._id);
      } else {
        await userService.activateUser(user._id);
      }
      fetchUsers();
    } catch (error) {
      console.error('Failed to update user status:', error);
    }
  };

  const handleDialogSuccess = () => {
    setDialogOpen(false);
    setSelectedUser(null);
    fetchUsers();
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pl-16 lg:pl-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Manage Users</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Create, update, and manage user accounts
          </p>
        </div>
        <Button onClick={handleCreate} className="whitespace-nowrap">
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-10"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
            <SelectItem value={UserRole.CEO}>CEO</SelectItem>
            <SelectItem value={UserRole.MANAGER}>Manager</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500 dark:text-gray-400">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user._id}>
                    <TableCell className="font-medium dark:text-white">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold text-sm">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <span>{user.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="dark:text-gray-300">{user.email}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.role === UserRole.ADMIN
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                            : user.role === UserRole.CEO
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                        }`}
                      >
                        {user.role}
                      </span>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => handleStatusToggle(user)}
                        className="flex items-center gap-2"
                      >
                        {user.is_active ? (
                          <>
                            <ToggleRight className="w-5 h-5 text-green-500" />
                            <span className="text-green-600 dark:text-green-400 text-sm">Active</span>
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="w-5 h-5 text-gray-400" />
                            <span className="text-gray-500 dark:text-gray-400 text-sm">Inactive</span>
                          </>
                        )}
                      </button>
                    </TableCell>
                    <TableCell className="dark:text-gray-300">
                      {user.createdAt
                        ? new Date(user.createdAt).toLocaleDateString()
                        : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(user)}
                          title="Edit user"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setResetPasswordDialog({ open: true, user })}
                          title="Reset password"
                        >
                          <KeyRound className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteDialog({ open: true, user })}
                          className="text-red-600 hover:text-red-700"
                          title="Delete user"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {total > limit && (
          <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3">
            <Pagination
              currentPage={page}
              totalPages={Math.ceil(total / limit)}
              totalItems={total}
              itemsPerPage={6}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      <UserDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSuccess={handleDialogSuccess}
        user={selectedUser}
      />

      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => !open && setDeleteDialog({ open: false, user: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deleteDialog.user?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={resetPasswordDialog.open}
        onOpenChange={(open) => !open && setResetPasswordDialog({ open: false, user: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Password</AlertDialogTitle>
            <AlertDialogDescription>
              Send a password reset email to {resetPasswordDialog.user?.email}? The user will receive
              an email with instructions to reset their password.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetPassword}>
              Send Reset Email
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
