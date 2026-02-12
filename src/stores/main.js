import { defineStore } from 'pinia'
import { ref, reactive, computed } from 'vue'

export const useMainStore = defineStore('main', () => {
    // ============ 核心数据 ============
    const resources = ref([])
    const groups = ref([])
    const userTemplates = ref([])

    // ============ 统计监控 ============
    const stats = reactive({
        nodeCount: computed(() => resources.value.filter(r => r.type === 'node').length),
        groupCount: computed(() => resources.value.filter(r => r.type === 'group').length),
        remoteCount: computed(() => resources.value.filter(r => r.type === 'remote').length),
        aggregateCount: computed(() => groups.value.length),
        totalActualNodes: computed(() => {
            return resources.value.reduce((sum, r) => {
                const count = (r.info && r.info.nodeCount) ? parseInt(r.info.nodeCount) : 0
                return sum + count
            }, 0)
        })
    })

    // ============ 认证状态 ============
    const isLoggedIn = ref(false)
    const loginPassword = ref('')
    const loginLoading = ref(false)

    // ============ UI 状态 ============
    const theme = ref(localStorage.getItem('theme') || 'dark')
    const currentTab = ref('resources')
    const resourceFilter = ref('all')
    const submitting = ref(false)
    const toast = reactive({ show: false, message: '', type: 'success' })

    // ============ 批量操作 ============
    const batchMode = ref(false)
    const selectedResources = ref([])

    // ============ 模态框状态 ============
    const resourceModal = reactive({ show: false, isEdit: false })
    const groupModal = reactive({ show: false, isEdit: false, tab: 'base' })
    const templateModal = reactive({ show: false, showMyTemplates: false })
    const previewModal = reactive({
        show: false,
        nodes: [],
        sortMode: false,
        editMode: false,
        resourceId: null,
        resourceItem: null,
        originalNodes: []
    })
    const settingsModal = reactive({ show: false, newPassword: '', confirmPassword: '' })

    // ============ 表单数据 ============
    const resourceForm = ref({ name: '', url: '', type: 'node' })
    const groupForm = ref({
        id: null,
        name: '',
        config: [],
        clash_config: {
            mode: 'generate',
            header: '',
            groups: [],
            rules: '',
            resources: [],
            raw_yaml: ''
        }
    })
    const groupNameError = ref(false)

    // ============ 节点选择器 ============
    const nodeSelector = reactive({
        show: false,
        loading: false,
        resourceId: null,
        resourceName: '',
        nodes: [],
        selected: 'all',
        tempSelected: []
    })

    const clashNodeSelector = reactive({
        show: false,
        loading: false,
        currentGroup: null,
        allResourceNames: [],
        allGroupNames: [],
        allNodeNames: [],
        nodesByResource: [],  // [{ subId, name, type, nodes: [name1, name2...] }]
        tempSelected: []
    })

    // ============ 远程订阅 ============
    const remoteModal = reactive({
        show: false,
        loading: false,
        mode: 'auto',
        url: '',
        name: '',
        ua: 'clash-verge/v1.7.7'
    })

    return {
        resources, groups, userTemplates, stats,
        isLoggedIn, loginPassword, loginLoading,
        theme, currentTab, resourceFilter, submitting, toast,
        batchMode, selectedResources,
        resourceModal, groupModal, templateModal, previewModal, settingsModal,
        resourceForm, groupForm, groupNameError,
        nodeSelector, clashNodeSelector,
        remoteModal
    }
})
