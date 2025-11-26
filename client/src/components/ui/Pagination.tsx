import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  showPageNumbers?: boolean;
  maxPageButtons?: number;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  showPageNumbers = true,
  maxPageButtons = 5,
}: PaginationProps) {
  // Calculate the range of items being displayed
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    
    if (totalPages <= maxPageButtons) {
      // Show all pages if total is less than max
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      // Calculate range around current page
      const startPage = Math.max(2, currentPage - Math.floor(maxPageButtons / 2));
      const endPage = Math.min(totalPages - 1, startPage + maxPageButtons - 3);

      // Adjust start if we're near the end
      const adjustedStart = endPage === totalPages - 1
        ? Math.max(2, endPage - maxPageButtons + 3)
        : startPage;

      // Add ellipsis if needed
      if (adjustedStart > 2) {
        pages.push('...');
      }

      // Add middle pages
      for (let i = adjustedStart; i <= endPage; i++) {
        pages.push(i);
      }

      // Add ellipsis if needed
      if (endPage < totalPages - 1) {
        pages.push('...');
      }

      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }

    return pages;
  };

  if (totalPages <= 1) {
    return (
      <div className="flex items-center justify-between px-4 py-3 sm:px-6">
        <div className="text-sm text-gray-700 dark:text-gray-300">
          Showing <span className="font-medium">{startItem}</span> to{' '}
          <span className="font-medium">{endItem}</span> of{' '}
          <span className="font-medium">{totalItems}</span> result{totalItems !== 1 ? 's' : ''}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 sm:px-6 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
      {/* Results info */}
      <div className="text-sm text-gray-700 dark:text-gray-300">
        Showing <span className="font-medium">{startItem}</span> to{' '}
        <span className="font-medium">{endItem}</span> of{' '}
        <span className="font-medium">{totalItems}</span> result{totalItems !== 1 ? 's' : ''}
      </div>

      {/* Pagination controls */}
      <div className="flex items-center gap-2">
        {/* Previous page button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="w-4 h-4 sm:mr-2" />
          <span className="hidden sm:inline">Previous</span>
        </Button>

        {/* Page numbers */}
        {showPageNumbers && (
          <div className="hidden md:flex items-center gap-1">
            {getPageNumbers().map((page, index) => {
              if (page === '...') {
                return (
                  <span
                    key={`ellipsis-${index}`}
                    className="px-3 py-1 text-gray-500 dark:text-gray-400"
                  >
                    ...
                  </span>
                );
              }

              const pageNum = page as number;
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onPageChange(pageNum)}
                  className="min-w-[2.5rem]"
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>
        )}

        {/* Mobile page indicator */}
        <div className="md:hidden px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-300">
          Page {currentPage} of {totalPages}
        </div>

        {/* Next page button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="w-4 h-4 sm:ml-2" />
        </Button>
      </div>
    </div>
  );
}
