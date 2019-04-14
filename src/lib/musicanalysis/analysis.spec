# -*- mode: python -*-

block_cipher = None


a = Analysis(['analysis.py'],
             pathex=['/Users/sandi/Projects/rs-designer/src/lib/musicanalysis'],
             binaries=[],
             datas=[('/usr/local/lib/python2.7/site-packages/resampy/data/*.npz', 'resampy/data')],
             hiddenimports=[ 'scipy._lib.messagestream', 'sklearn.tree', 'sklearn.neighbors.typedefs', 'sklearn.neighbors.quad_tree', 'sklearn.tree._utils'],
             hookspath=[],
             runtime_hooks=[],
             excludes=['matplotlib', 'TKinter', 'IPython', 'zmq', 'tk', 'tcl', 'mpl-data',],
             win_no_prefer_redirects=False,
             win_private_assemblies=False,
             cipher=block_cipher,
             noarchive=False)
pyz = PYZ(a.pure, a.zipped_data,
             cipher=block_cipher)
exe = EXE(pyz,
          a.scripts,
          a.binaries,
          a.zipfiles,
          a.datas,
          [],
          name='analysis',
          debug=False,
          bootloader_ignore_signals=False,
          strip=False,
          upx=True,
          runtime_tmpdir=None,
          console=False )

