<script setup lang="ts">
import { Document, Menu as IconMenu, Setting } from "@element-plus/icons-vue";
import AccountPage from "./views/account/index.vue";
import SettingPage from "./views/setting/index.vue";
import AdminPage from "./views/admin/index.vue";
import LogPage from "./views/log/index.vue";
import { ref, onMounted } from "vue";
const currentMenu = ref(1);
const machineId = ref("");
const upDateDialogVisible = ref(false)
const upDateLoding = ref(false)
const downloadProgress = ref(0)
const upDateMessage = ref('')
// const admins = ref([])
const disabled = ref(false);
const handleSelect = (index: number) => {
  currentMenu.value = +index;
};
const handleAdmin = () => {
  // let result  = admins.value.find(item=>item === machineId.value)
  // if(result){
  //   disabled.value = false
  // }else{
  //   disabled.value = true
  // }
};
const upDateDialogHandle= () => {
  window.electronAPI.downloadUpdate();
};
onMounted(async () => {
  machineId.value = await window.electronAPI.getMachineId();
  handleAdmin();
  window.electronAPI.checkForUpdates();
  window.electronAPI.onUpdateMessage((event:any, data: any) => {
    console.log('event: ', event);
    console.log('onUpdateMessage', data);
    if(data.name === 'update-available'){
      upDateMessage.value = data.text
      upDateDialogVisible.value = true
    }else if(data.name === 'download-progress'){
      upDateMessage.value = '下载中'
      downloadProgress.value = data.text
      upDateLoding.value = true
    }else if(data.name === 'update-downloaded'){
      upDateLoding.value = false
      upDateMessage.value = data.text
    }else if(data.name === 'error'){
      upDateMessage.value = data.text
      upDateLoding.value = false
    }
  });
});
</script>

<template>
  <div>
    <el-menu default-active="1" class="menu" @select="handleSelect">
      <el-menu-item index="1">
        <el-icon><icon-menu /></el-icon>
        <span>账户列表</span>
      </el-menu-item>
      <el-menu-item index="2">
        <el-icon><document /></el-icon>
        <span>实时日志</span>
      </el-menu-item>
      <el-menu-item index="3">
        <el-icon><setting /></el-icon>
        <span>软件配置</span>
      </el-menu-item>
      <el-menu-item index="4" :disabled="disabled">
        <el-icon><setting /></el-icon>
        <span>高级配置</span>
      </el-menu-item>
    </el-menu>
  </div>
  <div class="container">
    <span class="machine-id">机器码: {{ machineId }}</span>
    <AccountPage v-show="currentMenu === 1" />
    <LogPage v-if="currentMenu === 2" />
    <SettingPage v-if="currentMenu === 3" />
    <AdminPage v-if="currentMenu === 4" />
  </div>

  <el-dialog v-model="upDateDialogVisible" :close-on-click-modal="false" title="版本更新" width="300px" center>
    <span>
      {{ upDateMessage }}
    </span>
    <el-progress v-if="upDateLoding" :text-inside="true" :stroke-width="26" :percentage="downloadProgress" />
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="upDateDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="upDateDialogHandle" :loading="upDateLoding">
          立即更新
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<style scoped>
.menu {
  height: 100vh;
}
.container {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
}
.machine-id {
  color: #656d76;
  background-color: rgba(175, 184, 193, 0.2);
  padding: 0 4px;
  border-radius: 6px;
}
</style>
