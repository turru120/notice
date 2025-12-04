document.addEventListener('DOMContentLoaded', () => {
    const mypageUserName = document.getElementById('mypage-user-name');

    function getCategoriesKey() {
        const userId = localStorage.getItem('current_user_id');
        return `managed_categories_${userId || 'guest'}`;
    }

    const categoryList = document.getElementById('category-list');
    const newCategoryInput = document.getElementById('new-category-input');
    const addCategoryBtn = document.getElementById('add-category-btn');
    const emailSection = document.getElementById('email-section');
    const sitesListUl = document.getElementById('notification-sites-list');
    const editSitesBtn = document.getElementById('edit-sites-btn');
    

    let allSites = [];
    let userEmail = '';
    let categories = [];
    let isSitesEditMode = false;
    let isEmailEditMode = false;

    async function loadUserData() {
        try {
            const userId = localStorage.getItem('current_user_id');
            if (!userId) {
                throw new Error("No user is logged in.");
            }
            const response = await fetch(`get_sites.php?user_id=${userId}&t=${new Date().getTime()}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const user = await response.json();
            
            if(mypageUserName) {
                mypageUserName.innerHTML = `이름 : ${user.name || '사용자'}`;
            }

            // Update the existing P tag with id="user-id-display"
            const userIdDisplayElement = document.getElementById('user-id-display');
            if (userIdDisplayElement) {
                userIdDisplayElement.textContent = `회원번호 : ${user.id}`;
            }
            userEmail = user.email || '';
            allSites = user.registered_sites || [];

        } catch (error) {
            console.error("Error loading user data:", error);
            if(mypageUserName) {
                mypageUserName.innerHTML = '사용자 정보 로딩 실패';
            }
        }
    }

    function loadCategories() {
        const storedCategories = localStorage.getItem(getCategoriesKey());
        categories = storedCategories ? JSON.parse(storedCategories) : ['수업', '장학', '행사', '기타'];
    }

    function saveCategories() {
        localStorage.setItem(getCategoriesKey(), JSON.stringify(categories));
    }

    function renderCategories() {
        if (!categoryList) return;
        categoryList.innerHTML = '';
        categories.forEach(category => {
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center';
            li.dataset.category = category;

            const categoryContent = document.createElement('div');
            categoryContent.className = 'd-flex align-items-center';
            
            const handle = document.createElement('i');
            handle.className = 'bi bi-grip-vertical me-2';
            handle.style.cursor = 'grab';

            const name = document.createElement('span');
            name.textContent = category;

            categoryContent.appendChild(handle);
            categoryContent.appendChild(name);
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-danger btn-sm py-0';
            deleteBtn.textContent = '삭제';
            deleteBtn.dataset.category = category;

            li.appendChild(categoryContent);
            li.appendChild(deleteBtn);

            categoryList.appendChild(li);
        });
    }

    function renderEmailSection() {
        if (!emailSection) return;
        emailSection.innerHTML = '';
        if (isEmailEditMode) {
            emailSection.innerHTML = `
                <div class="flex-grow-1 me-3">
                    <input type="email" id="email-input" class="form-control form-control-sm" value="${userEmail}">
                </div>
                <button id="save-email-btn" class="btn btn-success btn-sm">저장</button>
            `;
            document.getElementById('save-email-btn').addEventListener('click', handleSaveEmail);
        } else {
            emailSection.innerHTML = `
                <div>
                    <span class="text-muted">알림 받을 이메일 : </span>
                    <strong>${userEmail || '이메일을 등록해주세요.'}</strong>
                </div>
                <button id="edit-email-btn" class="btn btn-outline-secondary btn-sm">편집</button>
            `;
            document.getElementById('edit-email-btn').addEventListener('click', toggleEmailEditMode);
        }
    }

    function renderSitesList() {
        if (!sitesListUl) return;
        sitesListUl.innerHTML = '';

        // `allSites`는 `loadUserData`를 통해 `user.json`에서 가져온 사이트 객체 배열입니다.
        // 이제 이 객체들은 `receiveNotification` 속성을 포함할 수 있습니다.

        if (isSitesEditMode) {
            allSites.forEach(site => {
                // `receiveNotification` 속성이 설정되지 않은 경우를 대비하여 기본값을 false로 간주합니다.
                const isChecked = site.receiveNotification === true;
                const li = document.createElement('li');
                li.className = 'list-group-item';
                li.innerHTML = `<div class="form-check"><input class="form-check-input site-checkbox" type="checkbox" value="${site.id}" id="site-${site.id}" ${isChecked ? 'checked' : ''}><label class="form-check-label" for="site-${site.id}">${site.site_name}</label></div>`;
                sitesListUl.appendChild(li);
            });
        } else {
            const sitesToDisplay = allSites.filter(site => site.receiveNotification === true);
            if (sitesToDisplay.length > 0) {
                sitesToDisplay.forEach(site => {
                    const li = document.createElement('li');
                    li.className = 'list-group-item';
                    li.textContent = site.site_name;
                    sitesListUl.appendChild(li);
                });
            } else {
                sitesListUl.innerHTML = '<li class="list-group-item text-muted">알림 받을 사이트가 없습니다.</li>';
            }
        }
    }
    
    function handleAddCategory() {
        const newCategory = newCategoryInput.value.trim();
        if (newCategory && !categories.includes(newCategory)) {
            categories.push(newCategory);
            saveCategories();
            renderCategories();
            newCategoryInput.value = '';
        } else if (categories.includes(newCategory)) {
            alert('이미 존재하는 분류입니다.');
        }
    }

    function handleDeleteCategory(e) {
        if (e.target.dataset.category) {
            const categoryToDelete = e.target.dataset.category;
            if (confirm(`'${categoryToDelete}' 분류를 삭제하시겠습니까?`)) {
                categories = categories.filter(cat => cat !== categoryToDelete);
                saveCategories();
                renderCategories();
            }
        }
    }

    function toggleEmailEditMode() {
        isEmailEditMode = !isEmailEditMode;
        renderEmailSection();
    }

    async function handleSaveEmail() {
        const emailInput = document.getElementById('email-input');
        const newEmail = emailInput.value.trim();
        if (!newEmail) {
            alert('이메일 주소를 입력해주세요.');
            return;
        }

        const userId = localStorage.getItem('current_user_id');
        if (!userId) {
            alert('로그인 정보가 없습니다. 다시 로그인해주세요.');
            return;
        }

        try {
            const response = await fetch('save_email.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: userId, email: newEmail })
            });

            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.message || 'Failed to save email.');
            }

            userEmail = newEmail;
            toggleEmailEditMode();

        } catch (error) {
            console.error('Error saving email:', error);
            alert(`이메일 저장에 실패했습니다: ${error.message}`);
        }
    }

    async function toggleSitesEditMode() {
        if (isSitesEditMode) { // 편집 모드에서 '완료'를 누른 경우
            isSitesEditMode = false;
            editSitesBtn.textContent = '저장 중...';
            editSitesBtn.disabled = true;

            const selectedIds = Array.from(document.querySelectorAll('.site-checkbox:checked')).map(cb => Number(cb.value));
            const userId = localStorage.getItem('current_user_id');

            try {
                const response = await fetch('save_notification_sites.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: userId, siteIds: selectedIds })
                });
                const result = await response.json();
                if (!response.ok || !result.success) {
                    throw new Error(result.message || 'Failed to save settings.');
                }
                
                // 서버 저장이 성공하면, 전체 데이터를 다시 로드하는 대신 로컬 데이터를 업데이트하여 UI를 즉시 갱신합니다.
                allSites.forEach(site => {
                    site.receiveNotification = selectedIds.includes(site.id);
                });

            } catch (error) {
                console.error('Error saving notification sites:', error);
                alert(`알림 사이트 설정 저장에 실패했습니다: ${error.message}`);
            } finally {
                editSitesBtn.textContent = '편집';
                editSitesBtn.disabled = false;
                editSitesBtn.classList.remove('btn-success');
                editSitesBtn.classList.add('btn-outline-secondary');
                renderSitesList(); // 편집이 끝났으므로, 목록을 다시 렌더링합니다.
            }

        } else { // '편집' 버튼을 누른 경우
            isSitesEditMode = true;
            editSitesBtn.textContent = '완료';
            editSitesBtn.classList.add('btn-success');
            editSitesBtn.classList.remove('btn-outline-secondary');
            renderSitesList(); // 편집 모드로 목록을 다시 렌더링합니다.
        }
    }

    async function init() {
        await loadUserData();
        loadCategories();
        
        renderCategories();
        renderEmailSection();
        renderSitesList();

        if (addCategoryBtn) {
            addCategoryBtn.addEventListener('click', handleAddCategory);
        }
        if (categoryList) {
            categoryList.addEventListener('click', handleDeleteCategory);
        }
        if (editSitesBtn) {
            editSitesBtn.addEventListener('click', toggleSitesEditMode);
        }
        
        if (categoryList) {
            new Sortable(categoryList, {
                animation: 150,
                handle: '.bi-grip-vertical',
                onEnd: function (evt) {
                    const newOrder = Array.from(evt.to.children).map(li => li.dataset.category);
                    categories = newOrder;
                    saveCategories();
                }
            });
        }
    }

    init();
});
