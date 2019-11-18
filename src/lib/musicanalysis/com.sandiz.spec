# -*- mode: python ; coding: utf-8 -*-

block_cipher = None


a = Analysis(['com.sandiz.rsdesigner', 'music-analysis.spec'],
             pathex=['/Users/sandi/Projects/rs-designer/src/lib/musicanalysis'],
             binaries=[],
             datas=[],
             hiddenimports=[],
             hookspath=['.--osx-bundle-identifier'],
             runtime_hooks=[],
             excludes=[],
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
          name='com.sandiz',
          debug=False,
          bootloader_ignore_signals=False,
          strip=False,
          upx=True,
          upx_exclude=[],
          runtime_tmpdir=None,
          console=False )
app = BUNDLE(exe,
             name='com.sandiz.app',
             icon=None,
             bundle_identifier=None)
