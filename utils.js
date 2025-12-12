// [보완] 겹치는 함수를 utils.js 파일로 이동 - 재사용성 향상
// 현재 사용자의 localStorage 키 생성
function getCalendarKey() {
    const userId = localStorage.getItem('current_user_id');
    return `calendar_notices_${userId || 'guest'}`;
}

function getCategoriesKey() {
    const userId = localStorage.getItem('current_user_id');
    return `managed_categories_${userId || 'guest'}`;
}

// 페이지네이션 UI 렌더링
function renderPagination(container, totalItems, currentPage, itemsPerPage) {
    if (!container) {
        console.error("Pagination container is not defined.");
        return;
    }

    container.innerHTML = '';
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 1) return;

    const maxPageNumbers = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPageNumbers / 2));
    let endPage = Math.min(totalPages, startPage + maxPageNumbers - 1);

    if (endPage - startPage + 1 < maxPageNumbers) {
        startPage = Math.max(1, endPage - maxPageNumbers + 1);
    }

    let paginationHtml = '<ul class="pagination justify-content-center">';
    paginationHtml += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}"><a class="page-link" href="#" data-page="${currentPage - 1}">&lt;</a></li>`;

    for (let i = startPage; i <= endPage; i++) {
        paginationHtml += `<li class="page-item ${i === currentPage ? 'active' : ''}"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`;
    }

    paginationHtml += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}"><a class="page-link" href="#" data-page="${currentPage + 1}">&gt;</a></li>`;
    paginationHtml += '</ul>';
    container.innerHTML = paginationHtml;
}
