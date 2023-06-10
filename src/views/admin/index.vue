<script setup lang="ts">
import { ref, reactive, toRaw, onMounted } from "vue";
import { ElMessage } from "element-plus";
let formInline = reactive({
  host: "15.207.71.65",
  username: "user1",
  password: "f3vUN1Hkq2i5F6Ac",
});
const connected = ref(false);
const connectedMsg = ref("");
const ruleFormRef = ref();
const rules = reactive({
  host: [{ required: true, message: "Please input host", trigger: "blur" }],
  username: [
    { required: true, message: "Please input username", trigger: "blur" },
  ],
  password: [
    { required: true, message: "Please input password", trigger: "blur" },
  ],
});

const checkSsh = async () => {
  let result: any = {};
  try {
    result = await window.electronAPI.checkSsh(toRaw(formInline));
    connected.value = result.status;
    connectedMsg.value = result.message;
  } catch (error: any) {
    console.log("error: ", error);
    // connected.value = false
    // connectedMsg.value = result.message
  }
};

onMounted(async () => {
  const sshInfo: any = await window.electronAPI.dbFindOne({
    name: "sshInfo",
  });
  if (sshInfo) {
    formInline.host = sshInfo.value.host;
    formInline.username = sshInfo.value.username;
    formInline.password = sshInfo.value.password;
    checkSsh();
  } else {
    window.electronAPI.dbUpdateOne(
      { name: "sshInfo" },
      { name: "sshInfo", value: toRaw(formInline) }
    );
  }
});

const loading = ref(false);

const onSubmit = async (formEl: any) => {
  if (!formEl) return;
  await formEl.validate((valid: any) => {
    if (valid) {
      console.log(toRaw(formInline));
      window.electronAPI
        .dbUpdateOne(
          { name: "sshInfo" },
          { name: "sshInfo", value: toRaw(formInline) }
        )
        .then((result: any) => {
          console.log("dbUpdateOne: ", result);
          ElMessage.success("保存成功.");
          checkSsh();
        })
        .catch((err: any) => {
          console.log("dbUpdateOne: ", err);
          ElMessage.error("保存失败.");
        });
    } else {
      console.log("error submit!");
    }
  });
};
</script>

<template>
  <a href="https://vitejs.dev" target="_blank">
    <img src="/electron-vite.svg" class="logo" alt="Vite logo" />
  </a>
  <h1 style="margin-bottom: 20px; text-align: center">远程登录信息</h1>
  <div class="status" style="margin-bottom: 20px">
    <el-tag class="ml-2" v-if="connected" type="success">已连接</el-tag>
    <el-tag class="ml-2" v-else type="danger">未连接</el-tag>
    <el-alert
      v-if="!connected && connectedMsg"
      style="margin-top: 10px"
      :title="connectedMsg"
      type="error"
    />
  </div>
  <el-form
    :model="formInline"
    ref="ruleFormRef"
    :rules="rules"
    class="demo-form-inline"
    label-width="100px"
  >
    <el-form-item label="host" prop="host">
      <el-input v-model="formInline.host" clearable placeholder="请输入host" />
    </el-form-item>
    <el-form-item label="username" prop="username">
      <el-input
        v-model="formInline.username"
        clearable
        placeholder="请输入username"
      />
    </el-form-item>
    <el-form-item label="password" prop="password">
      <el-input
        v-model="formInline.password"
        clearable
        type="password"
        placeholder="请输入password"
      />
    </el-form-item>
    <el-form-item>
      <el-button
        type="primary"
        @click="onSubmit(ruleFormRef)"
        :loading="loading"
        >保存</el-button
      >
    </el-form-item>
  </el-form>
  <!-- <p class="box">
    1、打开chrome 浏览器 <br />
    2、输入 chrome://version/ <br />
    3、把 <strong>可执行文件路径</strong> 复制到此处保存 <br />
  </p> -->
  <el-alert show-icon title="提示" description="请确认好远程登录信息，点击保存测试连接状态" type="warning" :closable="false" />

</template>

<style scoped>
a {
  color: #42b983;
}

label {
  margin: 0 0.5em;
  font-weight: bold;
}

code {
  background-color: #eee;
  padding: 2px 4px;
  border-radius: 4px;
  color: #304455;
}
.box {
  width: 100%;
  text-align: center;
  margin-bottom: 20px;
}
.demo-form-inline {
  width: 400px;
  padding-left: 30px;
}
</style>
