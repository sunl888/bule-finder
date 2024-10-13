function inArray(arr, key, val) {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i][key] === val) {
      return i
    }
  }
  return -1
}

Page({
  data: {
    devices: []
  },

  onLoad(query) {
    this.openBluetoothAdapter()
  },

  openBluetoothAdapter() {
    wx.openBluetoothAdapter({
      success: (res) => {
        this.startBluetoothDevicesDiscovery()
      },
      fail: (res) => {
        if (res.errCode === 10001) {
          wx.showModal({
            title: '错误',
            content: '未找到蓝牙设备, 请打开蓝牙后重试。',
            showCancel: false
          })
          wx.onBluetoothAdapterStateChange(function (res) {
            if (res && res.available) {
              this.startBluetoothDevicesDiscovery()
            }
          })
        }
      }
    })
  },

  startBluetoothDevicesDiscovery() {
    if (this._discoveryStarted) {
      return
    }
    this._discoveryStarted = true
    wx.startBluetoothDevicesDiscovery({
      allowDuplicatesKey: true,
      success: (res) => {
        this.onBluetoothDeviceFound()
      },
      fail: (err) => {
        console.log('查找蓝牙设备失败', err);
      }
    })
  },

  onBluetoothDeviceFound() {
    wx.onBluetoothDeviceFound((res) => {
      res.devices.forEach(device => {
        if (!device.name && !device.localName) {
          return
        }
        const foundDevices = this.data.devices
        const indexOf = inArray(foundDevices, 'deviceId', device.deviceId)
        const data = {}
        const distance = this.calculateDistance(device.RSSI);
        const isNear = distance < 3; // 跟踪设备且距离小于3米时提示接近

        const deviceInfo = {
          name: device.name || '未知设备',
          RSSI: device.RSSI,
          deviceId: device.deviceId,
          advertisServiceUUIDs: device.advertisServiceUUIDs,
          distance: distance,
          isNear: isNear
        }
        deviceInfo
        if (indexOf === -1) {
          data[`devices[${foundDevices.length}]`] = deviceInfo
        } else {
          data[`devices[${indexOf}]`] = deviceInfo
        }
        this.setData(data)
      })
    })
  },

  calculateDistance(rssi) {
    if (rssi === 0) return -1; // 信号丢失情况
    const txPower = -59; // 1米处的信号强度
    const ratio = rssi / txPower;
    let distance;
    if (ratio < 1.0) {
      distance = Math.pow(ratio, 10);
    } else {
      distance = (0.89976 * Math.pow(ratio, 7.7095)) + 0.111;
    }
    return distance.toFixed(3);
  }
})