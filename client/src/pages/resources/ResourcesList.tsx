import { useState, useEffect } from 'react';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import resourceService, { ResourceStatus } from '../../services/resourceService';
import type { Resource } from '../../services/resourceService';
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
  Switch,
} from '../../components/ui';
import { ResourceDialog } from './ResourceDialog';

export function ResourcesList() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; resource: Resource | null }>({
    open: false,
    resource: null,
  });

  const limit = 10;

  const fetchResources = async () => {
    try {
      setLoading(true);
      const response = await resourceService.getAll({
        page,
        limit,
        search: search || undefined,
        sort: 'resource_name',
        order: 'asc',
      });
      setResources(response.data);
      setTotal(response.total);
    } catch (error) {
      console.error('Failed to fetch resources:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, [page, search]);

  const handleCreate = () => {
    setSelectedResource(null);
    setDialogOpen(true);
  };

  const handleEdit = (resource: Resource) => {
    setSelectedResource(resource);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteDialog.resource) return;

    try {
      await resourceService.delete(deleteDialog.resource._id);
      setDeleteDialog({ open: false, resource: null });
      fetchResources();
    } catch (error) {
      console.error('Failed to delete resource:', error);
    }
  };

  const handleStatusToggle = async (resource: Resource) => {
    try {
      const newStatus = resource.status === ResourceStatus.ACTIVE
        ? ResourceStatus.INACTIVE
        : ResourceStatus.ACTIVE;
      await resourceService.updateStatus(resource._id, newStatus);
      fetchResources();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleDialogSuccess = () => {
    setDialogOpen(false);
    setSelectedResource(null);
    fetchResources();
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Resources</h1>
        <p className="text-sm sm:text-base text-gray-500 mt-1">Manage your resource information</p>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search resources..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-10"
          />
        </div>
        <Button onClick={handleCreate} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Add Resource
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading...</p>
        </div>
      ) : resources.length === 0 ? (
        <div className="text-center py-12 border border-gray-200 rounded-lg">
          <p className="text-gray-500">No resources found</p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block border border-gray-200 rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resources.map((resource) => (
                  <TableRow key={resource._id}>
                    <TableCell className="font-medium">{resource.resource_name}</TableCell>
                    <TableCell>{resource.email}</TableCell>
                    <TableCell>
                      {resource.currency} {resource.per_hour_rate}/hr
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={resource.status === ResourceStatus.ACTIVE}
                          onCheckedChange={() => handleStatusToggle(resource)}
                        />
                        <span className={resource.status === ResourceStatus.ACTIVE ? 'text-green-600' : 'text-gray-500'}>
                          {resource.status}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{new Date(resource.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(resource)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteDialog({ open: true, resource })}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {resources.map((resource) => (
              <div key={resource._id} className="border border-gray-200 rounded-lg p-4 bg-white">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{resource.resource_name}</h3>
                    <div className="flex items-center gap-2 mt-2">
                      <Switch
                        checked={resource.status === ResourceStatus.ACTIVE}
                        onCheckedChange={() => handleStatusToggle(resource)}
                      />
                      <span className={`text-sm ${resource.status === ResourceStatus.ACTIVE ? 'text-green-600' : 'text-gray-500'}`}>
                        {resource.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(resource)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteDialog({ open: true, resource })}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-500">Email:</span>
                    <p className="text-gray-900">{resource.email}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Rate:</span>
                    <p className="text-gray-900">{resource.currency} {resource.per_hour_rate}/hr</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Created:</span>
                    <p className="text-gray-900">{new Date(resource.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-500">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} resources
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page * limit >= total}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Create/Edit Dialog */}
      <ResourceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        resource={selectedResource}
        onSuccess={handleDialogSuccess}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, resource: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the resource "{deleteDialog.resource?.resource_name}".
              This action cannot be undone.
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
    </div>
  );
}
