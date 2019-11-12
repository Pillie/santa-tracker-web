import SceneManager from '../components/SceneManager/index.js'
import SoundManager from '../managers/SoundManager.js'
import LoaderManager from '../managers/LoaderManager.js'
import CameraController from '../components/CameraController/index.js'

export default class Download {
  constructor(el) {
    this.el = el

    this.ui = {
      popin: document.body.querySelector('[download-popin]'),
      gif: document.body.querySelector('[gif]'),
      link: document.body.querySelector('[download-link]'),
      exit: document.body.querySelector('[download-exit]'),
      canvas: document.body.querySelector('#canvas'),
    }

    this.maxGIFWidth = 1200

    this.bind()
    this.events()
    this.updateAspectRatio()
  }

  bind() {
    this.pushButton = this.pushButton.bind(this)
    this.generateGIF = this.generateGIF.bind(this)
    this.renderFrames = this.renderFrames.bind(this)
    this.onClickOutside = this.onClickOutside.bind(this)
    this.open = this.open.bind(this)
    this.exit = this.exit.bind(this)
  }

  events() {
    document.body.addEventListener('click', this.onClickOutside)

    this.el.addEventListener('mousedown', this.open)
    this.ui.popin.addEventListener('click', e => e.stopPropagation)
    this.ui.link.addEventListener('click', e => e.stopPropagation)
    this.ui.exit.addEventListener('mousedown', this.exit)
  }

  open() {
    this.pushButton(this.el, this.renderFrames)
    this.updateAspectRatio()
    this.ui.popin.classList.add('is-open')
    this.ui.popin.classList.add('is-loading')
  }

  exit() {
    this.pushButton(this.ui.exit)
    this.ui.popin.classList.remove('is-open')
    this.ui.popin.classList.remove('is-loading')
  }

  renderFrames() {
    console.log('start render frames')
    SoundManager.play('snowbox_photo');

    // clear mode
    SceneManager.setMode()
    // Reduce quality of canvas to avoid 12MB gifs

    const originWidth = this.ui.canvas.offsetWidth
    const originHeight = this.ui.canvas.offsetHeight
    // Reisze canvas in smaller size for performance
    const width = Math.min(this.maxGIFWidth / window.devicePixelRatio, originWidth / window.devicePixelRatio)
    console.log(width)
    const height = width * originHeight / originWidth
    SceneManager.renderer.setSize(width, height, false);
    CameraController.camera.aspect = width / height
    CameraController.camera.updateProjectionMatrix()

    const sources = []

    for (let i = 0; i < 16; i++) {
      CameraController.rotate('right', false, true, 0.5)
      // https://stackoverflow.com/questions/9491417/when-webgl-decide-to-update-the-display
      SceneManager.renderer.render(SceneManager.scene, CameraController.camera)
      const base64 = SceneManager.renderer.domElement.toDataURL()
      sources.push(base64)
    }

    // reset canvas size
    SceneManager.renderer.setSize(originWidth, originHeight, false);
    CameraController.camera.aspect = originWidth / originHeight
    CameraController.camera.updateProjectionMatrix()

    // wait for every images to load
    console.log('frames rendered')
    LoaderManager.subjects['gif'] = null // clean previous loader
    LoaderManager.load({name: 'gif', gif: sources}, this.generateGIF)
  }

  generateGIF() {
    console.log('load')
    const { sources } = LoaderManager.subjects['gif']

    const gif = new GIF({
      workers: 4,
      workerScript: '../../third_party/lib/gif/gif.worker.js',
      quality: 30,
      // width: this.ui.canvas.offsetWidth / 2,
      // height: this.ui.canvas.offsetHeight / 2,
    })

    sources.forEach(source => {
      gif.addFrame(source, {delay: 200})
    })

    gif.on('finished', blob => {
      console.log('gif finished')
      this.ui.popin.classList.remove('is-loading')
      this.ui.gif.src = URL.createObjectURL(blob)
      this.ui.link.href = URL.createObjectURL(blob)
    });

    gif.render()
  }

  updateAspectRatio() {
    // update image ratio
    const ratio = this.ui.canvas.offsetHeight / this.ui.canvas.offsetWidth * 100
    this.ui.gif.parentNode.style.paddingBottom = `${ratio}%`
  }

  pushButton(el, callback) {
    el.classList.add('is-clicked')
    setTimeout(() => {
      el.classList.remove('is-clicked')
      if (callback) {
        callback()
      }
    }, 200)
  }

  onClickOutside() {
    const el = this.ui.popin
    if (el.classList.contains('is-open') && !el.classList.contains('is-loading')) {
      el.classList.remove('is-open')
    }
  }
}

