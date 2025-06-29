class NotesApp {
    constructor() {
        this.notes = this.loadNotes();
        this.currentNote = null;
        this.isSidebarCollapsed = this.loadSidebarState();
        this.isTOCCollapsed = this.loadTOCState();
        this.isEditMode = false;
        this.originalContent = '';
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.renderNotesList();
        this.updateSidebarState();
        this.updateTOCState();
        this.showEmptyState();
    }

    bindEvents() {
        // 侧边栏折叠
        document.getElementById('toggleBtn').addEventListener('click', () => {
            this.toggleSidebar();
        });

        // 新建笔记
        document.getElementById('newNoteBtn').addEventListener('click', () => {
            this.showNewNoteModal();
        });

        // 编辑按钮
        document.getElementById('editBtn').addEventListener('click', () => {
            this.toggleEditMode();
        });

        // 保存笔记
        document.getElementById('saveBtn').addEventListener('click', () => {
            this.saveCurrentNote();
        });

        // 取消编辑
        document.getElementById('cancelBtn').addEventListener('click', () => {
            this.cancelEdit();
        });

        // 模态框事件
        document.getElementById('closeModal').addEventListener('click', () => {
            this.hideNewNoteModal();
        });

        document.getElementById('cancelBtn').addEventListener('click', () => {
            this.hideNewNoteModal();
        });

        document.getElementById('confirmBtn').addEventListener('click', () => {
            this.createNewNote();
        });

        // 工具栏事件
        this.bindToolbarEvents();

        // 图片上传
        document.getElementById('imageBtn').addEventListener('click', () => {
            document.getElementById('imageInput').click();
        });

        document.getElementById('imageInput').addEventListener('change', (e) => {
            this.handleImageUpload(e);
        });

        // 编辑器事件
        const editor = document.getElementById('editor');
        editor.addEventListener('input', () => {
            this.updatePreview();
        });

        // 目录事件
        document.getElementById('tocToggle').addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleTOC();
        });

        document.getElementById('tableOfContents').addEventListener('click', (e) => {
            const tocItem = e.target.closest('.toc-item');
            if (tocItem) {
                this.scrollToHeading(tocItem.dataset.target);
            }
        });

        // 目录拖拽功能
        this.initTOCDrag();

        // 滚动监听，自动高亮当前章节
        document.getElementById('previewContent').addEventListener('scroll', () => {
            this.updateActiveTOCItem();
        });

        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 's':
                        e.preventDefault();
                        if (this.isEditMode) {
                            this.saveCurrentNote();
                        }
                        break;
                    case 'n':
                        e.preventDefault();
                        this.showNewNoteModal();
                        break;
                    case 'b':
                        e.preventDefault();
                        this.toggleSidebar();
                        break;
                    case 'e':
                        e.preventDefault();
                        this.toggleEditMode();
                        break;
                }
            }
        });

        // 点击模态框外部关闭
        document.getElementById('newNoteModal').addEventListener('click', (e) => {
            if (e.target.id === 'newNoteModal') {
                this.hideNewNoteModal();
            }
        });
    }

    bindToolbarEvents() {
        const toolbar = document.querySelector('.toolbar-left');
        
        toolbar.addEventListener('click', (e) => {
            const btn = e.target.closest('.toolbar-btn');
            if (btn && !btn.id) {
                e.preventDefault();
                const command = btn.dataset.command;
                if (command) {
                    this.executeCommand(command);
                }
            }
        });
    }

    executeCommand(command) {
        if (!this.isEditMode) {
            this.toggleEditMode();
        }
        
        if (command.startsWith('h')) {
            document.execCommand('formatBlock', false, command);
        } else {
            document.execCommand(command, false, null);
        }
        document.getElementById('editor').focus();
    }

    handleImageUpload(event) {
        if (!this.isEditMode) {
            this.toggleEditMode();
        }
        
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.style.maxWidth = '100%';
                img.style.height = 'auto';
                
                const editor = document.getElementById('editor');
                const selection = window.getSelection();
                const range = selection.getRangeAt(0);
                range.insertNode(img);
                range.collapse(false);
                
                editor.focus();
            };
            reader.readAsDataURL(file);
        }
        event.target.value = '';
    }

    toggleEditMode() {
        if (!this.currentNote) {
            this.showToast('请先选择或创建一个笔记');
            return;
        }

        this.isEditMode = !this.isEditMode;
        
        const previewMode = document.getElementById('previewMode');
        const editMode = document.getElementById('editMode');
        const editBtn = document.getElementById('editBtn');
        const saveBtn = document.getElementById('saveBtn');
        const cancelBtn = document.getElementById('cancelBtn');
        const toolbar = document.querySelector('.toolbar-left');
        
        if (this.isEditMode) {
            // 进入编辑模式
            previewMode.style.display = 'none';
            editMode.style.display = 'block';
            editBtn.style.display = 'none';
            saveBtn.style.display = 'inline-flex';
            cancelBtn.style.display = 'inline-flex';
            toolbar.style.display = 'flex';
            
            // 保存原始内容
            this.originalContent = this.currentNote.content;
            
            // 设置编辑器内容
            document.getElementById('editor').innerHTML = this.currentNote.content;
            document.getElementById('editor').focus();
        } else {
            // 退出编辑模式
            this.exitEditMode();
        }
    }

    exitEditMode() {
        const previewMode = document.getElementById('previewMode');
        const editMode = document.getElementById('editMode');
        const editBtn = document.getElementById('editBtn');
        const saveBtn = document.getElementById('saveBtn');
        const cancelBtn = document.getElementById('cancelBtn');
        const toolbar = document.querySelector('.toolbar-left');
        
        previewMode.style.display = 'block';
        editMode.style.display = 'none';
        editBtn.style.display = 'inline-flex';
        saveBtn.style.display = 'none';
        cancelBtn.style.display = 'none';
        toolbar.style.display = 'none';
        
        this.isEditMode = false;
        this.updatePreview();
    }

    cancelEdit() {
        if (!this.currentNote) return;
        
        // 恢复原始内容
        this.currentNote.content = this.originalContent;
        document.getElementById('editor').innerHTML = this.originalContent;
        
        this.exitEditMode();
        this.loadNoteContent();
    }

    updatePreview() {
        if (this.currentNote) {
            const content = document.getElementById('editor').innerHTML;
            document.getElementById('previewContent').innerHTML = content;
            this.generateTOC();
        }
    }

    // 目录相关方法
    generateTOC() {
        const previewContent = document.getElementById('previewContent');
        const tocContent = document.getElementById('tocContent');
        const tocContainer = document.getElementById('tableOfContents');
        
        // 清除现有目录
        tocContent.innerHTML = '';
        
        // 获取所有标题元素
        const headings = previewContent.querySelectorAll('h1, h2, h3, h4, h5, h6');
        
        if (headings.length === 0) {
            tocContainer.style.display = 'none';
            return;
        }
        
        // 显示目录容器
        tocContainer.style.display = 'block';
        
        // 为每个标题添加ID
        headings.forEach((heading, index) => {
            const id = `heading-${index}`;
            heading.id = id;
            
            // 创建目录项
            const tocItem = document.createElement('div');
            tocItem.className = `toc-item ${heading.tagName.toLowerCase()}`;
            tocItem.textContent = heading.textContent;
            tocItem.dataset.target = id;
            
            tocContent.appendChild(tocItem);
        });
    }

    toggleTOC() {
        const tocContainer = document.getElementById('tableOfContents');
        const tocToggle = document.getElementById('tocToggle');
        const mainContent = document.querySelector('.main-content');
        
        this.isTOCCollapsed = !this.isTOCCollapsed;
        this.updateTOCState();
        this.saveTOCState();
    }

    scrollToHeading(targetId) {
        const targetElement = document.getElementById(targetId);
        if (targetElement) {
            targetElement.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
            
            // 高亮当前目录项
            this.highlightTOCItem(targetId);
        }
    }

    highlightTOCItem(targetId) {
        // 清除所有高亮
        document.querySelectorAll('.toc-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // 高亮当前项
        const activeItem = document.querySelector(`[data-target="${targetId}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
        }
    }

    toggleSidebar() {
        this.isSidebarCollapsed = !this.isSidebarCollapsed;
        this.updateSidebarState();
        this.saveSidebarState();
    }

    updateSidebarState() {
        const sidebar = document.getElementById('sidebar');
        if (this.isSidebarCollapsed) {
            sidebar.classList.add('collapsed');
        } else {
            sidebar.classList.remove('collapsed');
        }
    }

    updateTOCState() {
        const tocContainer = document.getElementById('tableOfContents');
        const tocToggle = document.getElementById('tocToggle');
        const mainContent = document.querySelector('.main-content');
        
        if (this.isTOCCollapsed) {
            tocContainer.classList.add('collapsed');
            tocToggle.classList.add('collapsed');
            mainContent.style.marginRight = '80px';
        } else {
            tocContainer.classList.remove('collapsed');
            tocToggle.classList.remove('collapsed');
            mainContent.style.marginRight = '320px';
        }
    }

    saveSidebarState() {
        localStorage.setItem('notes_sidebar_collapsed', JSON.stringify(this.isSidebarCollapsed));
    }

    loadSidebarState() {
        const saved = localStorage.getItem('notes_sidebar_collapsed');
        return saved ? JSON.parse(saved) : false;
    }

    saveTOCState() {
        localStorage.setItem('notes_toc_collapsed', JSON.stringify(this.isTOCCollapsed));
    }

    loadTOCState() {
        const saved = localStorage.getItem('notes_toc_collapsed');
        return saved ? JSON.parse(saved) : false;
    }

    showNewNoteModal() {
        document.getElementById('newNoteModal').style.display = 'block';
        document.getElementById('noteTitle').focus();
    }

    hideNewNoteModal() {
        document.getElementById('newNoteModal').style.display = 'none';
        document.getElementById('noteTitle').value = '';
    }

    createNewNote() {
        const title = document.getElementById('noteTitle').value.trim();
        if (!title) {
            alert('请输入笔记标题');
            return;
        }

        const newNote = {
            id: this.generateId(),
            title: title,
            content: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.notes.unshift(newNote);
        this.saveNotes();
        this.renderNotesList();
        this.hideNewNoteModal();
        this.selectNote(newNote);
        this.showToast('笔记创建成功');
    }

    selectNote(note) {
        this.currentNote = note;
        this.updateActiveNote();
        this.loadNoteContent();
    }

    updateActiveNote() {
        document.querySelectorAll('.note-item').forEach(item => {
            item.classList.remove('active');
        });

        if (this.currentNote) {
            const activeItem = document.querySelector(`[data-note-id="${this.currentNote.id}"]`);
            if (activeItem) {
                activeItem.classList.add('active');
            }
        }
    }

    loadNoteContent() {
        const previewContent = document.getElementById('previewContent');
        const editor = document.getElementById('editor');
        
        if (this.currentNote) {
            previewContent.innerHTML = this.currentNote.content;
            editor.innerHTML = this.currentNote.content;
            this.generateTOC();
        } else {
            previewContent.innerHTML = '';
            editor.innerHTML = '';
            document.getElementById('tocContent').innerHTML = '';
        }
    }

    saveCurrentNote() {
        if (!this.currentNote) {
            this.showToast('请先选择或创建一个笔记');
            return;
        }

        const editor = document.getElementById('editor');
        this.currentNote.content = editor.innerHTML;
        this.currentNote.updatedAt = new Date().toISOString();
        
        this.saveNotes();
        this.renderNotesList();
        this.exitEditMode();
        this.showToast('保存成功');
    }

    renderNotesList() {
        const notesList = document.getElementById('notesList');
        
        if (this.notes.length === 0) {
            notesList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-sticky-note"></i>
                    <h3>暂无笔记</h3>
                    <p>点击"新建"按钮开始创建你的第一个笔记</p>
                </div>
            `;
            return;
        }

        notesList.innerHTML = this.notes.map(note => `
            <div class="note-item" data-note-id="${note.id}">
                <div class="note-title">${note.title}</div>
                <div class="note-date">${this.formatDate(note.updatedAt)}</div>
            </div>
        `).join('');

        // 绑定点击事件
        document.querySelectorAll('.note-item').forEach(item => {
            item.addEventListener('click', () => {
                const noteId = item.dataset.noteId;
                const note = this.notes.find(n => n.id === noteId);
                if (note) {
                    this.selectNote(note);
                }
            });
        });
    }

    showEmptyState() {
        const previewContent = document.getElementById('previewContent');
        previewContent.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-edit"></i>
                <h3>欢迎使用个人笔记</h3>
                <p>在左侧创建新笔记开始记录你的想法</p>
            </div>
        `;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) { // 1分钟内
            return '刚刚';
        } else if (diff < 3600000) { // 1小时内
            return `${Math.floor(diff / 60000)}分钟前`;
        } else if (diff < 86400000) { // 1天内
            return `${Math.floor(diff / 3600000)}小时前`;
        } else if (diff < 2592000000) { // 30天内
            return `${Math.floor(diff / 86400000)}天前`;
        } else {
            return date.toLocaleDateString();
        }
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    showToast(message) {
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #28a745;
            color: white;
            padding: 12px 20px;
            border-radius: 4px;
            z-index: 10000;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 2000);
    }

    loadNotes() {
        const saved = localStorage.getItem('notes_data');
        return saved ? JSON.parse(saved) : [];
    }

    saveNotes() {
        localStorage.setItem('notes_data', JSON.stringify(this.notes));
    }

    // 目录拖拽功能
    initTOCDrag() {
        const tocContainer = document.getElementById('tableOfContents');
        const tocHeader = document.querySelector('.toc-header');
        let isDragging = false;
        let startX, startY, startLeft, startTop;

        tocHeader.addEventListener('mousedown', (e) => {
            if (e.target.closest('.toc-toggle')) return; // 不拖拽切换按钮
            
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            startLeft = parseInt(tocContainer.style.left) || 0;
            startTop = parseInt(tocContainer.style.top) || 0;
            
            tocContainer.style.cursor = 'grabbing';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            const newLeft = startLeft + deltaX;
            const newTop = startTop + deltaY;
            
            // 限制在视窗范围内
            const maxLeft = window.innerWidth - tocContainer.offsetWidth - 20;
            const maxTop = window.innerHeight - tocContainer.offsetHeight - 20;
            
            tocContainer.style.left = Math.max(20, Math.min(newLeft, maxLeft)) + 'px';
            tocContainer.style.top = Math.max(80, Math.min(newTop, maxTop)) + 'px';
            tocContainer.style.right = 'auto';
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                tocContainer.style.cursor = 'grab';
            }
        });
    }

    updateActiveTOCItem() {
        const previewContent = document.getElementById('previewContent');
        const headings = previewContent.querySelectorAll('h1, h2, h3, h4, h5, h6');
        const tocItems = document.querySelectorAll('.toc-item');
        
        if (headings.length === 0 || tocItems.length === 0) return;
        
        const scrollTop = previewContent.scrollTop;
        const containerHeight = previewContent.clientHeight;
        const threshold = containerHeight / 3; // 三分之一处作为判断点
        
        let activeHeading = null;
        
        // 找到当前可见的标题
        for (let i = headings.length - 1; i >= 0; i--) {
            const heading = headings[i];
            const rect = heading.getBoundingClientRect();
            const headingTop = rect.top + scrollTop;
            
            if (headingTop <= scrollTop + threshold) {
                activeHeading = heading;
                break;
            }
        }
        
        // 如果没有找到，使用第一个标题
        if (!activeHeading && headings.length > 0) {
            activeHeading = headings[0];
        }
        
        // 更新目录高亮
        if (activeHeading) {
            tocItems.forEach(item => {
                item.classList.remove('active');
            });
            
            const activeTocItem = document.querySelector(`[data-target="${activeHeading.id}"]`);
            if (activeTocItem) {
                activeTocItem.classList.add('active');
            }
        }
    }
}

// 添加CSS动画
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new NotesApp();
}); 