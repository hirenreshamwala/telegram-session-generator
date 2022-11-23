<script setup>
  import { ElButton, ElCard, ElMessage, ElLink, ElForm, ElFormItem, ElInput, ElTooltip, ElLoading} from 'element-plus'
  import { ref, reactive } from 'vue'
  import axios from 'axios'

  const loading = ref(false);
  const showOTPForm = ref(false);
  const session_str = ref('');
  const otpFormRef = ref()
  const otpForm = reactive({
    api_id: '',
    otp: ''
  })
  const ruleFormRef = ref()
  const form = reactive({
    api_id: '280837',
    api_hash: '398b21b75d436f1b968405168d4984e0',
    phone_number: '919913260460'
  })
  
  const rules = reactive({
      'api_id': [
          { required: true, message: 'Please enter API ID', trigger: 'blur' },
      ],
      'api_hash': [
          { required: true, message: 'Please enter API Hash', trigger: 'blur' },
      ],
      'phone_number': [
          { required: true, message: 'Please enter phone number with country code', trigger: 'blur' },
      ],
  })

  const requestCode = () => {
    loading.value = true;
    axios.post('/generate-session', {
        api_id: form.api_id,
        api_hash: form.api_hash,
        phone_number: form.phone_number
    })
    .then(({data}) => {
        const {
            status, error, message
        } = data;

        if(status === 'error'){
          ElMessage({
              showClose: true,
              message: error,
              type: 'error',
          });return;
        }
        if(status === 'success'){
            ElMessage({
                showClose: true,
                message: message || 'Please enter OTP',
                type: 'success',
            });
            showOTPForm.value = true;
        }
        
    })
    .catch((error) => {
        console.log(error.response);
    }).finally(() => {
      loading.value = false;
    });
  }
  const submitForm = async () => {
    if (!ruleFormRef.value) return
    await ruleFormRef.value.validate((valid, fields) => {
        if (!valid) {
            return;
        }

        requestCode();
    })
  }

  const submitOtp = async () => {
    if (!otpFormRef.value) return
    await otpFormRef.value.validate((valid, fields) => {
        if (!valid) {
            return;
        }

        requestLogin();
    })
  }

  const requestLogin = () => {
      loading.value = true;
      axios.post('/validate-otp', {
          api_id: form.api_id,
          otp: otpForm.otp
      }).then(({data}) => {
          const {
              status, error, message, session
          } = data;

          if(status === 'error'){
              ElMessage({
                  showClose: true,
                  message: error,
                  type: 'error',
              });return;
          }
          if(status === 'success'){
              ElMessage({
                  showClose: true,
                  message: message || 'Please enter OTP',
                  type: 'success',
              });
              otpForm.otp = '';
              showOTPForm.value = false;
              session_str.value = session;
          }
          
      })
      .catch((error) => {
          console.log(error.response);
      }).finally(() => {
        loading.value = false;
      });
  };
</script>

<template>
  <div v-loading="loading">
      <div class="flex min-h-full items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <el-card class="w-full max-w-xl space-y-8">
              <template #header>
                  <div class="card-header text-center">
                    <span>Telegram session generator</span>
                  </div>
              </template>
              <div class="text-center">
                  <el-link href="https://my.telegram.org/auth" target="_blank">Generate Key</el-link>
              </div>
              <el-form ref="ruleFormRef" :model="form" :rules="rules" label-position="top">
                  <el-form-item label="API ID" prop="api_id">
                      <el-input v-model="form.api_id" placeholder="Enter your API ID" :disabled="showOTPForm" />
                  </el-form-item>
                  <el-form-item label="API Hash" prop="api_hash">
                      <el-input v-model="form.api_hash" placeholder="Enter your API Hash" :disabled="showOTPForm" />
                  </el-form-item>
                  <el-form-item label="Phone Number" prop="phone_number">
                      <el-input v-model="form.phone_number" placeholder="Enter your phone number" :disabled="showOTPForm">
                          <template #append>
                              <el-tooltip
                                  class="box-item"
                                  effect="dark"
                                  content="Enter your phone number with country code"
                                  placement="top-end"
                              >
                                  <el-button>info</el-button>
                              </el-tooltip>
                              
                          </template>
                      </el-input>
                  </el-form-item>
                  <el-form-item>
                      <el-button @click="submitForm" :disabled="showOTPForm">Get OTP</el-button>
                  </el-form-item>
              </el-form>

              <el-form class="mt-6" ref="otpFormRef" :model="otpForm" :rules="rules" label-position="top" v-if="showOTPForm">
                  <el-form-item label="OTP" prop="otp">
                      <el-input v-model="otpForm.otp" placeholder="Enter OTP" />
                  </el-form-item>
                  <el-form-item>
                      <el-button @click="submitOtp">Login</el-button>
                  </el-form-item>
              </el-form>

              <div v-if="session_str">
                  <div>Session: </div>
                  <div class="p-4 bg-blue-100 break-all">{{ session_str }}</div>
              </div>
          </el-card>

          <div class="text-center"><a href="email:hiren.reshamwala@gmail.com">hiren.reshamwala@gmail.com</a></div>
      </div>
  </div>
</template>

<style scoped>
</style>
