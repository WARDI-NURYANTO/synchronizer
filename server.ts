import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.NODE_ENV === 'production' ? (process.env.PORT || 8080) : (process.env.DEFAULT_APP_PORT || 3000);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// In-memory data store replicating Dapodik local database & e-Rapor sync state
interface School {
  sekolah_id: string;
  nama: string;
  npsn: string;
  alamat_jalan: string;
  desa_kelurahan?: string;
  kecamatan?: string;
  kabupaten_kota?: string;
  provinsi?: string;
  kode_pos?: string;
  pengguna: {
    pengguna_id: string;
    username: string;
    nama: string;
    peran_id?: number;
  };
  url_erapor?: string;
}

const defaultSchools: School[] = [
  {
    sekolah_id: '90e54911-31f5-e011-b844-311ba0c310c1',
    nama: 'SMKN 1 PATROL',
    npsn: '20271077',
    alamat_jalan: 'Jl. Raya Bugel Blok Badak',
    desa_kelurahan: 'Bugel',
    kecamatan: 'Patrol',
    kabupaten_kota: 'Kab. Indramayu',
    provinsi: 'Jawa Barat',
    kode_pos: '45258',
    pengguna: {
      pengguna_id: 'pengguna-smk-01',
      username: 'enwewardivespa@yahoo.co.id',
      nama: 'Wardi Nuryanto',
      peran_id: 10,
    },
    url_erapor: 'http://localhost:8154',
  },
  {
    sekolah_id: '81f65022-42e6-f122-c955-422cb1d421d2',
    nama: 'SMK NEGERI 2 SURABAYA',
    npsn: '20532567',
    alamat_jalan: 'Jl. Tentara Genie Pelajar No. 26',
    desa_kelurahan: 'Petemon',
    kecamatan: 'Sawahan',
    kabupaten_kota: 'Kota Surabaya',
    provinsi: 'Jawa Timur',
    kode_pos: '60252',
    pengguna: {
      pengguna_id: 'pengguna-smk-02',
      username: 'admin_smkn2sby@admin.smk.belajar.id',
      nama: 'Operator Dapodik',
      peran_id: 10,
    },
    url_erapor: '',
  },
  {
    sekolah_id: '72e76133-53f7-0233-da66-533dc2e532e3',
    nama: 'SMK NEGERI 5 BANDUNG',
    npsn: '20219145',
    alamat_jalan: 'Jl. Bojongkoneng No. 37A',
    desa_kelurahan: 'Sukamaju',
    kecamatan: 'Cibeunying Kidul',
    kabupaten_kota: 'Kota Bandung',
    provinsi: 'Jawa Barat',
    kode_pos: '40124',
    pengguna: {
      pengguna_id: 'pengguna-smk-03',
      username: 'admin_smkn5bdg@admin.smk.belajar.id',
      nama: 'Staff Kurikulum',
      peran_id: 10,
    },
    url_erapor: '',
  },
];

let schools: School[] = JSON.parse(JSON.stringify(defaultSchools));

let currentSchoolId = '90e54911-31f5-e011-b844-311ba0c310c1';
let dapodikConnected = true;

const initialSyncCounts: Record<string, number> = {
  ptk: 85,
  rombel: 36,
  pd_aktif: 1250,
  pd_keluar: 8,
  anggota_matpil: 420,
  pembelajaran: 680,
  ekskul: 18,
  anggota_ekskul: 780,
  dudi: 45,
};

let syncCounts = { ...initialSyncCounts };

const syncMeta: Record<string, { label: string; next: string | false }> = {
  ptk: { label: 'PTK', next: 'rombel' },
  rombel: { label: 'Rombongan Belajar', next: 'pd_aktif' },
  pd_aktif: { label: 'Peserta Didik Aktif', next: 'pd_keluar' },
  pd_keluar: { label: 'Peserta Didik Keluar', next: 'anggota_matpil' },
  anggota_matpil: { label: 'Anggota Rombel Matpel Pilihan', next: 'pembelajaran' },
  pembelajaran: { label: 'Pembelajaran', next: 'ekskul' },
  ekskul: { label: 'Ekstrakurikuler', next: 'anggota_ekskul' },
  anggota_ekskul: { label: 'Anggota Ekstrakurikuler', next: 'dudi' },
  dudi: { label: 'Relasi Dunia Usaha & Industri', next: false },
};

function getTableSync() {
  return [
    { data: 'PTK', aksi: 'ptk', count: syncCounts.ptk },
    { data: 'Rombongan Belajar', aksi: 'rombel', count: syncCounts.rombel },
    { data: 'Peserta Didik Aktif', aksi: 'pd_aktif', count: syncCounts.pd_aktif },
    { data: 'Peserta Didik Keluar', aksi: 'pd_keluar', count: syncCounts.pd_keluar },
    { data: 'Anggota Rombel Matpel Pilihan', aksi: 'anggota_matpil', count: syncCounts.anggota_matpil },
    { data: 'Pembelajaran', aksi: 'pembelajaran', count: syncCounts.pembelajaran },
    { data: 'Ekstrakurikuler', aksi: 'ekskul', count: syncCounts.ekskul },
    { data: 'Anggota Ekstrakurikuler', aksi: 'anggota_ekskul', count: syncCounts.anggota_ekskul },
    { data: 'Relasi Dunia Usaha & Industri', aksi: 'dudi', count: syncCounts.dudi },
  ];
}

// Auth Login
app.post('/api/auth/login/:provider', (req: Request, res: Response) => {
  const { code } = req.body;
  const user = {
    id: 1,
    name: 'Wardi Nuryanto',
    email: 'wardinuryanto73@admin.smk.belajar.id',
    sekolah_id: currentSchoolId,
    avatar: '/images/avatars/avatar-1.png',
  };

  const userAbility = [
    { action: 'read', subject: 'Web' },
    { action: 'read', subject: 'Ptk' },
  ];

  return res.json({
    error: false,
    userAbility,
    accessToken: 'token-smk-sync-' + Date.now(),
    userData: user,
  });
});

// Current User
app.get('/api/user', (_req: Request, res: Response) => {
  const activeSchool = schools.find((s) => s.sekolah_id === currentSchoolId) || schools[0];
  res.json({
    id: 1,
    name: 'Wardi Nuryanto',
    email: 'wardinuryanto73@admin.smk.belajar.id',
    sekolah_id: activeSchool?.sekolah_id,
  });
});

// Get Sekolah & Sync status
app.get('/api/sekolah', (_req: Request, res: Response) => {
  const activeSchool = schools.find((s) => s.sekolah_id === currentSchoolId) || schools[0];
  const table_sync = getTableSync();
  const jumlah = table_sync.reduce((acc, curr) => acc + curr.count, 0);

  const responseData = {
    versiApp: 'v2.0.0',
    sekolah: schools,
    user: {
      id: 1,
      name: 'Wardi Nuryanto',
      email: 'wardinuryanto73@admin.smk.belajar.id',
      sekolah_id: activeSchool?.sekolah_id,
      pengguna_id: activeSchool?.pengguna.pengguna_id,
      sekolah: activeSchool,
      erapor: {
        url_erapor: activeSchool?.url_erapor || '',
      },
      semester: {
        semester_id: '20261',
        tahun_ajaran_id: '2026',
        nama: '2026/2027 Ganjil',
        periode_aktif: 1,
      },
    },
    jumlah,
    table_sync,
    error: !dapodikConnected,
    cek_sekolah: {
      success: !!(activeSchool && activeSchool.url_erapor),
    },
  };

  return res.json(responseData);
});

// Update selected school
app.post('/api/sekolah', (req: Request, res: Response) => {
  const { sekolah_id, pengguna_id } = req.body;
  if (!sekolah_id) {
    return res.status(422).json({ message: 'Sekolah tidak boleh kosong' });
  }

  const find = schools.find((s) => s.sekolah_id === sekolah_id);
  if (find) {
    currentSchoolId = sekolah_id;
    if (pengguna_id) {
      find.pengguna.pengguna_id = pengguna_id;
    }
  }

  return res.json({
    sekolah: find,
    npsn: find?.npsn,
  });
});

// Send / Sync Data
app.post('/api/kirim-data', (req: Request, res: Response) => {
  const { sekolah_id, aksi, url_erapor, count } = req.body;
  const activeSchool = schools.find((s) => s.sekolah_id === (sekolah_id || currentSchoolId));

  if (aksi === 'url') {
    if (activeSchool) {
      activeSchool.url_erapor = url_erapor;
    }
    return res.json({
      icon: 'tabler-check',
      color: 'success',
      title: 'Berhasil!',
      text: 'URL e-Rapor SMK v8 berhasil disimpan',
      next: false,
    });
  }

  if (aksi && syncMeta[aksi]) {
    const meta = syncMeta[aksi];
    const dataCount = count !== undefined ? count : syncCounts[aksi] || 0;
    
    // Mark as sent
    syncCounts[aksi] = 0;

    return res.json({
      icon: 'tabler-check',
      color: 'success',
      title: 'Berhasil!',
      text: `${dataCount} Data ${meta.label} berhasil dikirim ke e-Rapor SMK`,
      next: meta.next,
    });
  }

  return res.json({
    icon: 'tabler-info-circle',
    color: 'info',
    title: 'Informasi',
    text: 'Data telah diproses',
    next: false,
  });
});

// Register school
app.post('/api/register', (req: Request, res: Response) => {
  const { url_erapor, sekolah } = req.body;
  const targetSchool = schools.find((s) => s.sekolah_id === (sekolah?.sekolah_id || currentSchoolId));
  if (targetSchool && url_erapor) {
    targetSchool.url_erapor = url_erapor;
  }

  return res.json({
    icon: 'tabler-check',
    color: 'success',
    title: 'Registrasi Berhasil!',
    text: `Sekolah ${targetSchool?.nama || 'SMK'} berhasil didaftarkan ke e-Rapor SMK v8!`,
  });
});

// Reset data
app.get('/api/reset', (_req: Request, res: Response) => {
  schools = JSON.parse(JSON.stringify(defaultSchools));
  syncCounts = { ...initialSyncCounts };
  dapodikConnected = true;
  return res.json({ success: true, message: 'Data synchronizer telah di-reset ke default.' });
});

// Normalkan endpoint
app.all('/normalkan{/*path}', (_req: Request, res: Response) => {
  dapodikConnected = true;
  res.json({
    status: 'success',
    message: 'Koneksi Dapodik berhasil dinormalkan.',
  });
});

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('{/*path}', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Synchronizer server ready on http://0.0.0.0:${PORT}`);
  });
}

startServer();
