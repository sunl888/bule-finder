Page({
  data: {
    devices: [], // 实时显示的设备列表
    tempDevices: [], // 临时存储的新设备信息
    deviceTimeout: 10000, // 超过10秒未更新的设备将移除
    refreshInterval: null // 保存定时器ID
  },

  onLoad(query) {
    // 开启蓝牙
    this.openBluetoothAdapter();
    // 监听蓝牙状态改变
    this.bluetoothAdapterStateChange();
    // 启动刷新定时器
    this.startDeviceRefreshInterval(); 
  },

  onUnload() {
    this.stopDeviceRefreshInterval(); // 页面卸载时停止定时器
  },

  // 启动定时器，每秒刷新设备列表
  startDeviceRefreshInterval() {
    this.setData({
      refreshInterval: setInterval(() => {
        const currentTime = new Date().getTime();
        let tempDevices = this.data.tempDevices;
        // 移除超过一定时间没有更新的设备
        tempDevices = tempDevices.filter(device => currentTime - device.timestamp <= this.data.deviceTimeout);
        // 按距离从近到远排序
        tempDevices.sort((a, b) => a.distance - b.distance);
        // 更新设备列表
        this.setData({
          devices: tempDevices
        });
      }, 800) // 每0.8秒刷新一次
    });
  },

  // 停止定时器
  stopDeviceRefreshInterval() {
    clearInterval(this.data.refreshInterval);
  },

  bluetoothAdapterStateChange() {
    // 这里用箭头函数，让this指向Page而不是函数本身作用域
    wx.onBluetoothAdapterStateChange((res) => {
      if (!res.available) {
        wx.showToast({
          title: '蓝牙被关闭',
          icon: 'error',
          duration: 1000
        })
      } else if (!res.discovering) {
        this._discoveryStarted = false;
        this.startBluetoothDevicesDiscovery();
      }
    });
  },

  openBluetoothAdapter() {
    wx.openBluetoothAdapter({
      success: (res) => {
        this.startBluetoothDevicesDiscovery()
      },
      fail: (res) => {
        if (res.errCode === 10001) {
          wx.showToast({
            title: '未找到蓝牙设备',
            icon: 'loading',
            duration: 3000
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
      const foundDevices = this.data.devices; // 已发现的设备列表
      const currentTime = new Date().getTime();

      res.devices.forEach(device => {
        if (!device.name && !device.localName) {
          return
        }
        const indexOf = foundDevices.findIndex(d => d.deviceId === device.deviceId);
        const distance = this.calculateDistance(device.RSSI); // 计算距离
        const isNear = distance < 3; // 设备靠近的标志
        const deviceInfo = {
          name: device.name || '未知设备',
          rssi: device.RSSI,
          deviceId: device.deviceId,
          distance: distance,
          isNear: isNear,
          timestamp: currentTime // 记录设备最后一次更新的时间
        };
        if (indexOf === -1) {
          // 新设备加入列表
          foundDevices.push(deviceInfo);
        } else {
          // 更新已有设备的信息
          foundDevices[indexOf] = deviceInfo;
        }
      }); 
      // 更新设备列表
      this.setData({ tempDevices: foundDevices });
    });
  },

  /**
   * 环境衰减因子（Path Loss Exponent），它表示信号传播的环境影响。常见的值：
   * 空旷环境：n ≈ 2
   * 室内有障碍物的环境：n ≈ 2.7 - 4.0
   * 墙体较多的环境：n ≈ 3 - 4 
   */
  calculateDistance(rssi) {
    const TxPower = -59; // 1米处的信号强度
    const n = 2; // 环境因子，假设空旷环境

    if (rssi === 0) {
      return -1; // 无法计算距离
    }
    // 使用公式计算距离
    const ratio = (TxPower - rssi) / (10 * n);
    const distance = Math.pow(10, ratio);

    return distance.toFixed(3); // 返回三位小数
  }
})