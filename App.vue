<script>
export default {
  onLaunch() {
    if (wx.cloud) {
      wx.cloud.init({ env: 'cloudbase-d2gao37vp8879bc2c', traceUser: true })
    }
  }
}
</script>

<style lang="scss">
@import '@/uni.scss';
</style>
