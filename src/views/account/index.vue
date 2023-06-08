<script setup lang="ts">
import axios from "axios";
import { ref, reactive } from "vue";
import { ElMessage } from "element-plus";
const tableData:any = [];

const formInline = reactive({
  uname: "",
  url: "",
});

const downloadPath = ref("");
const ruleFormRef = ref();

const checkUrl = (rule: any, value: any, callback: any) => {
  console.log(rule);
  if (value === "") {
    callback(new Error("请输入要打开的网址"));
  } else {
    const urlRegex = /^(http|https):\/\/(\S+)$/;
    if (urlRegex.test(value)) {
      callback();
    } else {
      callback(new Error("The URL is invalid"));
    }
  }
};
const rules = reactive({
  uname: [{ required: true, message: "请输入户名", trigger: "blur" }],
  url: [{ validator: checkUrl, trigger: "blur" }],
});

const chromePath = ref("");
const handleBoot = async (row: any) => {
  const chromeDir: any = await window.electronAPI.dbFindOne({
    name: "chromePath",
  });

  const sshData: any = await window.electronAPI.dbFindOne({
    name: "sshInfo",
  });
  if(!sshData){
    return ElMessage.error("请在高级设置中配置服务器信息");
  }

  if (chromeDir) {
    chromePath.value = chromeDir.value;
  } else {
    ElMessage.error("请在设置中配置浏览器路径");
    return;
  }
  const device: any = await window.electronAPI.getDeviceInfo();
  if (device) {
    downloadPath.value = `${device.downloadsPath}/${row.uname}`;
  }
  axios({
    method: "post",
    url: "http://localhost:3005/launch",
    data: {
      ...row,
      sshInfo:sshData.value,
      chromePath: chromePath.value,
      downloadPath: downloadPath.value,
      url: row.url,
    },
  })
    .then(async ({ data }) => {
      console.log("data: ", data);
      let logInfo: any = {
        uname: row.uname,
      };
      if (data.code !== 0) {
        ElMessage.error(data.message);
        logInfo.message = data.message;
      }else{
        logInfo.message = `${row.uname}启动成功`
      }
      await window.electronAPI.checkDir(downloadPath.value);
      // 存储日志
      window.electronAPI.dbInsert({name:'logInfo',value:logInfo});
    })
    .catch((err) => {
      console.log("err: ", err);
    });
};

const onSubmit = async (formEl: any) => {
  if (!formEl) return;
  await formEl.validate((valid: any) => {
    if (valid) {
      handleBoot({
        uname: formInline.uname,
        url: formInline.url,
      });
    }
  });
};
</script>

<template>
  <a href="https://vitejs.dev" target="_blank">
    <img src="/electron-vite.svg" class="logo" alt="Vite logo" />
  </a>
  <h1 style="margin-bottom: 20px">账户列表</h1>
  <div class="card">
    <el-table :data="tableData" style="width: 100%" size="large">
      <el-table-column
        type="index"
        label="#"
        header-align="center"
        align="center"
      />
      <el-table-column
        prop="uname"
        label="账户名"
        header-align="center"
        align="center"
      />
      <el-table-column label="操作" header-align="center" align="center">
        <template #default="{ row }">
          <el-button type="success" @click="handleBoot(row)">启动</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
  <el-button type="primary" style="margin-top: 20px">刷新</el-button>
  <el-divider />
  <div class="other">
    <h4 style="margin-top: 20px; margin-bottom: 20px; text-align: center">
      手动运行
    </h4>
    <el-form
      :inline="true"
      :model="formInline"
      ref="ruleFormRef"
      :rules="rules"
      class="demo-form-inline"
    >
      <el-form-item label="账户名" prop="uname">
        <el-input v-model="formInline.uname" clearable  placeholder="请输入账户名" />
      </el-form-item>
      <el-form-item label="网址" prop="url">
        <el-input v-model="formInline.url" clearable placeholder="请输入要打开的网址" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="onSubmit(ruleFormRef)"
          >运行</el-button
        >
      </el-form-item>
    </el-form>
  </div>
</template>

<style scoped>
.card {
  width: 60%;
}
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>
