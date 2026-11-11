import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CACHE_DIR = path.join(ROOT, '.cache');
const LOGO_DIR = path.join(ROOT, 'public', 'logos');
const DATA_DIR = path.join(ROOT, 'data');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const TDT_URL = 'https://www.tdtchannels.com/lists/tv.m3u8';
const IPTV_ES_URL = 'https://iptv-org.github.io/iptv/countries/es.m3u';

const SELECTION = [
  'La1.TV', 'La2.TV', '24Horas.TV', 'TDP.TV', 'Clan.TV', '324.TV', '13.TV', 'ElToroTV.TV', 'RMTV.TV',
  'Euronews.TV', 'ElPais.TV', 'ElConfidencial.TV', 'Negocios.TV', 'E3.TV', 'ETBD.TV', 'Top_Barça.TV', 'SX3.TV',
  'CanalSurA.TV', '7TV_Andalucía.TV', '101Malaga.TV', 'Almería_24h.TV', 'OndaCadiz.TV', 'TuyaLaJanda.TV',
  'OndaAlgeciras.TV', 'PTV_Malaga.TV', 'Teleonuba.TV', 'CanalCosta.TV', 'Condavision.TV', 'MarbellaTV.TV',
  'CostaNO.TV', 'CanalMalaga.TV', '101Antequera.TV', 'InterAlmeria.TV', 'PTV_Linares.TV', 'PTV_Sevilla.TV',
  'Telemotril.TV', 'Torrevision.TV', 'FuengirolaTV.TV', '9LaLoma.TV', 'Mijas340TV.TV', 'PTV_Granada.TV',
  'CanalCoin.TV', 'DiezTV_Andujar.TV', 'DiezTV_LasVillas.TV', 'DiezTV_Ubeda.TV',
  'Canarias.TV', 'La1_CAN.TV', 'La2_CAN.TV', '24H_CAN.TV', 'Canal4_Tenerife.TV', 'MirameTV.TV', 'AtlánticoTV.TV',
  'PopularTV_S.TV', 'CMM.TV', 'Imas.TV',
  'TV3.TV', 'C33.TV', 'La1_CAT.TV', 'La2_CAT.TV', '24H_CAT.TV', 'BonDiaTV_CAT.TV', 'BTV.TV',
  'Xarxa_Canal_Reus_TV.TV', 'Xarxa_EmpordaTV.TV', 'Xarxa_Canal_Terrassa.TV', 'Xarxa_TAC12.TV', 'Xarxa_LleidaTV.TV',
  'Xarxa_TV_Costa_Brava.TV', 'Xarxa_Televisio_Hospitalet.TV', 'Xarxa_Penedes_TV.TV', 'Xarxa_Canal_Taronja_Central.TV',
  'Xarxa_Canal_Taronja_Anoia.TV', 'Xarxa_VOTV.TV', 'Xarxa_Canal_10_Emporda.TV', 'Xarxa_Televisio_BDN.TV',
  'Xarxa_TV_Sabadell_Valles.TV', 'Xarxa_ETV.TV',
  'Distrito.TV', 'Dejate.TV', 'EsTuTele.TV', 'C33M.TV',
  '7Televalencia.TV', '8M.TV', 'TeleElx.TV', 'Alacanti.TV', 'Elche7.TV', 'Punt3.TV',
  'Extremadura.TV', 'TVGAL.TV', 'TVG2.TV', 'TeleVigo.TV', 'TVR.TV',
  'ETB1.TV', 'ETB2.TV', 'ETB1ON.TV', 'ETB2ON.TV', 'ETBON_Oca1.TV', 'ETBON_Oca2.TV', 'PopularMU.TV',
  'TVE_INTER.TV', 'TVE_STAR.TV', 'TVC.TV', 'SolMusica.TV', 'Solidaria.TV', 'EWTN.TV',
  'Vinx.TV', 'EnergeekRetro.TV', 'EnergeekFan.TV',
  'ATVHD.TV', 'CNNInt.TV', 'Bloom.TV', 'DW.TV', 'TV5Monde.TV', 'AlJQ.TV', 'TeleSUR.TV', 'ADN40.TV', 'Medi1.TV'
];

// Canales de TDTChannels sin tvg-id; se seleccionan por nombre.
const NAME_SELECTION = [
  // Illes Balears
  ['TEF.TV', 'TEF'],
  ['Canal4Mallorca.TV', 'Canal 4 TV Mallorca'],
  // Castilla y León
  ['TVAranda.TV', 'TV Aranda'],
  // Navarra
  ['XaloaTelebista.TV', 'Xaloa Telebista'],
  // Cantabria
  ['SajaNansaTV.TV', 'Saja Nansa TV'],
  ['DeLareduLinTV.TV', 'De Laredu Lin TV'],
  // R. de Murcia
  ['ArabiTV.TV', 'Arabí TV'],
  // Madrid
  ['Teleganes.TV', 'Teleganés'],
  ['iPROtv.TV', 'iPROtv'],
  ['LIRATV.TV', 'LIRA TV'],
  // Galicia
  ['Telemino.TV', 'Telemiño'],
  ['AnoveTV.TV', 'Anove TV'],
  // País Vasco
  ['Tele7.TV', 'Tele 7'],
  ['HamaikaTV.TV', 'Hamaika TV'],
  ['GUKATB.TV', 'GUKA TB'],
  ['GoienaTV.TV', 'Goiena Eus'],
  ['28Kanala.TV', '28 Kanala'],
  // Canarias
  ['TenerifeMasTV.TV', 'Tenerife Más TV'],
  ['LancelotTV.TV', 'Lancelot TV'],
  ['AhoraTV.TV', 'Ahora TV'],
  ['FuerteventuraTV.TV', 'Fuerteventura TV'],
  ['AfortunadasTV.TV', 'Afortunadas TV'],
  // Andalucía
  ['7TV_Cadiz.TV', '7TV Cádiz'],
  ['7TV_Cordoba.TV', '7TV Córdoba'],
  ['7TV_Huelva.TV', '7TV Huelva'],
  ['7TV_Jaen.TV', '7TV Jaén'],
  ['7TV_Malaga.TV', '7TV Málaga'],
  ['7TV_Sevilla.TV', '7TV Sevilla'],
  ['8TV_SierraCadiz.TV', '8TV Sierra de Cádiz'],
  ['8TV_Chiclana.TV', '8TV Chiclana'],
  ['8TV_LaJanda.TV', '8TV La Janda'],
  ['TVM_Cordoba.TV', 'TVM Córdoba'],
  ['TeleGranada.TV', 'TeleGranada'],
  ['HuelvaConecta.TV', 'Huelva Conecta'],
  ['AlmeriaTV.TV', 'Almería TV'],
  ['CanalSanRoque.TV', 'Canal San Roque'],
  ['TG7.TV', 'TG7'],
  ['AndaluciaCocina.TV', 'Andalucía Cocina'],
  ['CanalSurMasNoticias.TV', 'Canal Sur Más Noticias'],
  // Cataluña
  ['Canal4Catalunya.TV', 'Canal 4 TV Catalunya'],
  ['CanalTaronjaOsona.TV', 'Canal Taronja Osona i Moianés'],
  ['PieraTV.TV', 'Piera TV'],
  // Comunitat Valenciana
  ['IntercomarcalTV.TV', 'Intercomarcal TV'],
  ['tvA.TV', 'tvA'],
  ['BurrianaTeVe.TV', 'Burriana TeVe'],
  ['TV4LaVall.TV', 'TV 4 La Vall'],
  ['TVAlmassora.TV', 'TV Almassora'],
  ['UneVinalopo.TV', 'Une Vinalopó'],
  ['33TV.TV', '33TV'],
  // Castilla-La Mancha
  ['TVHellin.TV', 'TV Hellín'],
  ['GuadaTVMedia.TV', 'Guada TV Media'],
  ['AlcarriaTV.TV', 'Alcarria TV'],
  ['Canal4Mancha.TV', 'Canal 4 Mancha'],
  // Extremadura
  ['TorosExtremadura.TV', 'Toros (Canal Extremadura)']
];

const GROUP_ALIASES = {
  Generalistas: 'Nacional',
  Informativos: 'Noticias',
  Deportivos: 'Deportes',
  Infantiles: 'Infantil',
  'C. de Madrid': 'Madrid',
  'C. Valenciana': 'Comunitat Valenciana',
  'C. Foral de Navarra': 'Navarra',
  'P. de Asturias': 'Asturias',
  'Illes Balears': 'Baleares',
  'Int. Europa': 'Internacional',
  'Int. América': 'Internacional',
  'Int. Asia': 'Internacional',
  'Int. África': 'Internacional',
  'Int. Oceanía': 'Internacional',
  Musicales: 'Música',
  Religiosos: 'Religión'
};

const GROUP_ORDER = [
  'Nacional', 'Mediaset (oficial)', 'Noticias', 'Deportes', 'Infantil',
  'Andalucía', 'Aragón', 'Baleares', 'Canarias', 'Cantabria', 'Castilla-La Mancha', 'Castilla y León',
  'Cataluña', 'Madrid', 'Comunitat Valenciana', 'Extremadura', 'Galicia', 'La Rioja', 'Navarra',
  'País Vasco', 'Asturias', 'R. de Murcia', 'Melilla',
  'Internacional', 'Música', 'Religión'
];

const DEFAULT_IDS = ['La1.TV', 'La2.TV', 'Antena3.ATP', 'LaSexta.ATP', '24Horas.TV', 'TDP.TV'];

const DYNAMIC_CHANNELS = [
  {
    id: 'Antena3.ATP',
    name: 'Antena 3',
    group: 'Nacional',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Logo_Antena_3_2025_%28Naranja%29.svg/960px-Logo_Antena_3_2025_%28Naranja%29.svg.png',
    resolver: { type: 'atresplayer', liveId: '5a6a165a7ed1a834493ebf6a' },
    headers: { referer: 'https://www.atresplayer.com/', origin: 'https://www.atresplayer.com' }
  },
  {
    id: 'LaSexta.ATP',
    name: 'laSexta',
    group: 'Nacional',
    logoUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/75/LaSexta_2024_Logo.svg/960px-LaSexta_2024_Logo.svg.png',
    resolver: { type: 'atresplayer', liveId: '5a6a172c7ed1a834493ebf6b' },
    headers: { referer: 'https://www.atresplayer.com/', origin: 'https://www.atresplayer.com' }
  },
  {
    id: 'Neox.ATP',
    name: 'Neox',
    group: 'Nacional',
    logoUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3c/Neox_2023_logo.svg/960px-Neox_2023_logo.svg.png',
    resolver: { type: 'atresplayer', liveId: '5a6a17da7ed1a834493ebf6d' },
    headers: { referer: 'https://www.atresplayer.com/', origin: 'https://www.atresplayer.com' }
  },
  {
    id: 'Nova.ATP',
    name: 'Nova',
    group: 'Nacional',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/8c/Nova_2010.png',
    resolver: { type: 'atresplayer', liveId: '5a6a180b7ed1a834493ebf6e' },
    headers: { referer: 'https://www.atresplayer.com/', origin: 'https://www.atresplayer.com' }
  },
  {
    id: 'Mega.ATP',
    name: 'Mega',
    group: 'Nacional',
    logoUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8c/MEGA.svg/500px-MEGA.svg.png',
    resolver: { type: 'atresplayer', liveId: '5a6a18357ed1a834493ebf6f' },
    headers: { referer: 'https://www.atresplayer.com/', origin: 'https://www.atresplayer.com' }
  },
  {
    id: 'Atreseries.ATP',
    name: 'Atreseries',
    group: 'Nacional',
    logoUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/16/Atreseries_2020_logo.svg/960px-Atreseries_2020_logo.svg.png',
    resolver: { type: 'atresplayer', liveId: '5a6a189a7ed1a834493ebf70' },
    headers: { referer: 'https://www.atresplayer.com/', origin: 'https://www.atresplayer.com' }
  },
  {
    id: 'Telemadrid.BC',
    name: 'Telemadrid',
    group: 'Madrid',
    logoUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/71/TeleMadrid.svg/960px-TeleMadrid.svg.png',
    resolver: {
      type: 'brightcove',
      account: '6416060453001',
      video: '6389770581112',
      policyKey: 'BCpkADawqM3NEbF-VfhWkeqZ-VvbtOz3Ck-glPFUGbpuJZKbMZuXqUpB5QUIzHZcSBDRhqMED02XmDcxjSfh5O6KbAugVjXAZkUr1JvkXRtqnKUcE_x2JA5JhSZC7AFkFSzWcTKiOsiKe6C8E5gvQQIvMXtmuQQbzsaw3g',
      referer: 'https://www.telemadrid.es/'
    },
    headers: { referer: 'https://www.telemadrid.es/', origin: 'https://www.telemadrid.es' }
  },
  {
    id: 'APunt.BC',
    name: 'À Punt',
    group: 'Comunitat Valenciana',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Logotip_d%27%C3%80_Punt_%282017-%29.svg/960px-Logotip_d%27%C3%80_Punt_%282017-%29.svg.png',
    resolver: {
      type: 'brightcove',
      account: '6057955885001',
      video: '6137605659001',
      policyKey: 'BCpkADawqM2Yrv2qlBGpB2FCRjQ97X2SDg4r2xbdzl5jKZbkiKrGFaQ2mCXaaNZWyEyQPtX4LR7OCKmYpat8jXceN9PP_qZMOMQSbNqeDf5kln0xC0-cI2KoRkf8ab1FLRVNVCORQA9ME8vg',
      referer: 'https://www.apuntmedia.es/'
    },
    headers: { referer: 'https://www.apuntmedia.es/', origin: 'https://www.apuntmedia.es' }
  }
];

// Canales de Mediaset: su directo online usa DASH+DRM y no se puede incrustar.
// Se ofrecen como accesos directos al reproductor oficial.
const EXTERNAL_CHANNELS = [
  {
    id: 'Telecinco.EXT',
    name: 'Telecinco',
    group: 'Mediaset (oficial)',
    externalUrl: 'https://www.mediasetinfinity.es/directo/telecinco/',
    logoUrl: 'https://img-prod-api2.mediasetplay.mediaset.it/api/images/by/v5/esp/bym%3A78af25b897b04871%2Foriginal%2FChannel_logo-Telecinco.png/single/320/320'
  },
  {
    id: 'Cuatro.EXT',
    name: 'Cuatro',
    group: 'Mediaset (oficial)',
    externalUrl: 'https://www.mediasetinfinity.es/directo/cuatro/',
    logoUrl: 'https://img-prod-api2.mediasetplay.mediaset.it/api/images/by/v5/esp/bym%3A53a479204cd1b90c%2Foriginal%2FChannel_logo-Cuatro.png/single/320/320'
  },
  {
    id: 'Divinity.EXT',
    name: 'Divinity',
    group: 'Mediaset (oficial)',
    externalUrl: 'https://www.mediasetinfinity.es/directo/divinity/',
    logoUrl: 'https://img-prod-api2.mediasetplay.mediaset.it/api/images/by/v5/esp/bym%3A2d171af32198a28b%2Foriginal%2FChannel_logo-Divinity.png/single/320/320'
  },
  {
    id: 'FDF.EXT',
    name: 'FDF',
    group: 'Mediaset (oficial)',
    externalUrl: 'https://www.mediasetinfinity.es/directo/fdf/',
    logoUrl: 'https://img-prod-api2.mediasetplay.mediaset.it/api/images/by/v5/esp/bym%3A3e0daeaea23ce874%2Foriginal%2FChannel_logo-FDF.png/single/320/320'
  },
  {
    id: 'Energy.EXT',
    name: 'Energy',
    group: 'Mediaset (oficial)',
    externalUrl: 'https://www.mediasetinfinity.es/directo/energy/',
    logoUrl: 'https://img-prod-api2.mediasetplay.mediaset.it/api/images/by/v5/esp/bym%3A6fa44f38a85b5697%2Foriginal%2FChannel_logo-Energy.png/single/320/320'
  },
  {
    id: 'Boing.EXT',
    name: 'Boing',
    group: 'Mediaset (oficial)',
    externalUrl: 'https://www.mediasetinfinity.es/directo/boing/',
    logoUrl: 'https://img-prod-api2.mediasetplay.mediaset.it/api/images/by/v5/esp/bym%3A6fa6a4c72ed5fd0b%2Foriginal%2FChannel_logo-Boing.png/single/320/320'
  },
  {
    id: 'BeMad.EXT',
    name: 'Be Mad',
    group: 'Mediaset (oficial)',
    externalUrl: 'https://www.mediasetinfinity.es/directo/bemad/',
    logoUrl: 'https://img-prod-api2.mediasetplay.mediaset.it/api/images/by/v5/esp/bym%3A3bc14722599558f0%2Foriginal%2FChannel_logo-Bemad.png/single/320/320'
  }
];

const EXTRA_CHANNELS = [
  {
    id: 'PTVCordoba.TV',
    name: 'PTV Córdoba',
    group: 'Andalucía',
    urls: ['https://streamer.zapitv.com/PTV_CORDOBA/index.m3u8']
  },
  {
    id: '101Antequera.TV',
    name: '101TV Antequera',
    group: 'Andalucía',
    headers: { referer: 'https://player.instantvideocloud.net/' },
    urls: ['https://liveingesta318.cdnmedia.tv/101weblive/smil:antequera.smil/playlist.m3u8']
  },
  {
    id: 'EsteponaTV.TV',
    name: 'Estepona TV',
    group: 'Andalucía',
    urls: ['https://cloudvideo.servers10.com:8081/8022/index.m3u8']
  },
  {
    id: 'M95Marbella.TV',
    name: 'M95 Marbella',
    group: 'Andalucía',
    urls: ['https://limited2.todostreaming.es/live/m95-livestream.m3u8']
  },
  {
    id: 'Canal2000.TV',
    name: 'Canal 2000 La Solana',
    group: 'Castilla-La Mancha',
    urls: ['http://canal2000.berkano-systems.net/streaming/streams/canal2000.m3u8']
  },
  {
    id: 'Canal45.TV',
    name: 'Canal 45',
    group: 'Cataluña',
    urls: ['https://nlb1-live.emitstream.com/hls/625csn5et2iszm9oze65/master.m3u8']
  },
  {
    id: 'Canal56.TV',
    name: 'Canal 56',
    group: 'Cataluña',
    urls: ['https://videos.canal56.com/directe/stream/index.m3u8']
  },
  {
    id: 'OndaValencia.TV',
    name: 'Onda Valencia TV',
    group: 'Comunitat Valenciana',
    urls: ['https://cloudvideo.servers10.com:8081/8116/index.m3u8']
  },
  {
    id: 'TeleSafor2.TV',
    name: 'Tele Safor',
    group: 'Comunitat Valenciana',
    urls: ['https://video.telesafor.com/hls/video.m3u8']
  },
  {
    id: '8LaMarina.TV',
    name: '8 La Marina TV',
    group: 'Comunitat Valenciana',
    urls: ['https://streaming005.gestec-video.com/hls/canal24.m3u8']
  },
  {
    id: 'Maestrat.TV',
    name: 'Maestrat TV',
    group: 'Comunitat Valenciana',
    urls: ['https://stream.maestrat.tv/hls/stream.m3u8']
  }
];

const EXTRA_URLS = {
  'TeleVigo.TV': ['https://stream-us-east-1.getpublica.com/playlist.m3u8?network_id=16113&live=1'],
  '101Antequera.TV': ['https://liveingesta318.cdnmedia.tv/101weblive/smil:antequera.smil/playlist.m3u8'],
  'EsTuTele.TV': ['https://cloud.streamingconnect.tv/hls/estutele/estutele.m3u8']
};

const LOGO_ID_OVERRIDES = {
  'La1.TV': 'La1.es@SD',
  'La2.TV': 'La2.es@SD',
  '24Horas.TV': '24Horas.es@SD',
  'TDP.TV': 'Teledeporte.es@SD',
  'Clan.TV': 'Clan.es@SD',
  '324.TV': '3CatInfo.es@SD',
  'TV3.TV': 'TV3.es@SD',
  'C33.TV': 'El33.es@SD',
  'SX3.TV': 'SX3.es@SD',
  'E3.TV': 'Esport3.es@SD',
  'CanalSurA.TV': 'CanalSurAndalucia.es@SD',
  'CMM.TV': 'CMMTV.es@HD',
  'TVGAL.TV': 'GaliciaTVEuropa.es@SD',
  'TVG2.TV': 'TVG2.es@SD',
  'ETB1.TV': 'ETB1.es@SD',
  'ETB2.TV': 'ETB2.es@SD',
  'ETB1ON.TV': 'ETB1On.es@HD',
  'ETB2ON.TV': 'ETB2On.es@HD',
  '13.TV': 'Trece.es@SD',
  'RMTV.TV': 'RealMadridTV.es@SD',
  'Canarias.TV': 'TelevisionCanaria.es@SD',
  'TVC.TV': 'TV3CAT.es@SD',
  'TVE_INTER.TV': 'TVEInternacionalEurope.es@HD',
  'TVE_STAR.TV': 'TVEStar.es@HD',
  'C33M.TV': 'Canal33Madrid.es@SD',
  'Distrito.TV': 'DistritoTV.es@SD',
  'EsTuTele.TV': 'EsTuTele.es@SD',
  'Punt3.TV': 'Punt3.es@SD',
  'TeleElx.TV': 'TeleElx.es@SD',
  'Alacanti.TV': 'AlacantiTV.es@SD',
  'Elche7.TV': 'Elche7TV.es@SD',
  'TeleVigo.TV': 'TeleVigo.es@SD',
  'OndaCadiz.TV': 'OndaCadiz.es@SD',
  'OndaAlgeciras.TV': 'OndaAlgeciras.es@SD',
  'PTV_Malaga.TV': 'PTVMalaga.es@SD',
  'PTV_Sevilla.TV': 'PTVSevilla.es@SD',
  'PTV_Granada.TV': 'PTVGranada.es@SD',
  'PTV_Linares.TV': 'PTVLinares.es@SD',
  'Teleonuba.TV': 'Teleonuba.es@SD',
  'CanalCosta.TV': 'CanalCosta.es@SD',
  'Condavision.TV': 'Condavision.es@SD',
  'Mijas340TV.TV': 'Mijas340TV.es@SD',
  'Telemotril.TV': 'Telemotril.es@SD',
  'CanalMalaga.TV': 'CanalMalagaRTV.es@SD',
  'InterAlmeria.TV': 'InteralmeriaTV.es@SD',
  '101Malaga.TV': '101tvMalaga.es@SD',
  '101Antequera.TV': '101tvAntequera.es@SD',
  'MirameTV.TV': 'MirameTV.es@SD',
  'PopularMU.TV': 'PopularTVMurcia.es@SD',
  'Imas.TV': 'ImasTV.es@SD',
  'SolMusica.TV': 'SolMusica.es@SD',
  'Solidaria.TV': 'SolidariaTV.es@SD',
  'EWTN.TV': 'EWTNEspana.es@SD',
  '7TV_Andalucía.TV': '7TV.es@Andalucia',
  'CanalCoin.TV': 'CanalCoinTV.es@SD',
  '9LaLoma.TV': '9laLomaTV.es@SD',
  'CostaNO.TV': 'CostaNoroesteTV.es@SD',
  'MarbellaTV.TV': 'RadioTelevisionMarbella.es@SD',
  'FuengirolaTV.TV': null,
  'Torrevision.TV': null,
  'Canal4_Tenerife.TV': null,
  'TuyaLaJanda.TV': null,
  'Almería_24h.TV': null,
  'TVR.TV': null,
  'PopularTV_S.TV': null,
  'AtlánticoTV.TV': null,
  'Dejate.TV': 'Dejate.es@SD',
  'BTV.TV': 'BarcelonaTV.es@SD',
  'PTVCordoba.TV': 'PTVCordoba.es@SD',
  '101Antequera.TV': '101tvAntequera.es@SD',
  'EsteponaTV.TV': 'EsteponaTelevision.es@SD',
  'M95Marbella.TV': 'M95TelevisionMarbella.es@SD',
  'Canal2000.TV': 'Canal2000.es@SD',
  'Canal45.TV': 'Canal45.es@SD',
  'Canal56.TV': 'Canal56.es@SD',
  'OndaValencia.TV': 'OndaValenciaTV.es@SD',
  'TeleSafor2.TV': 'TeleSafor.es@SD',
  '8LaMarina.TV': '8LaMarinaTV.es@SD',
  'Maestrat.TV': 'MaestratTV.es@SD'
};

function parsePlaylist(text) {
  const lines = text.split(/\r?\n/);
  const entries = [];
  let current = null;
  let pendingHeaders = [];
  for (const line of lines) {
    if (line.startsWith('#EXTINF')) {
      const attr = (name) => {
        const match = line.match(new RegExp(`${name}="([^"]*)"`));
        return match ? match[1] : '';
      };
      current = {
        id: attr('tvg-id'),
        name: attr('tvg-name') || line.split(',').slice(1).join(',').trim(),
        logo: attr('tvg-logo'),
        group: attr('group-title'),
        referrer: attr('http-referrer'),
        userAgent: attr('http-user-agent'),
        headers: {}
      };
      pendingHeaders = [];
    } else if (line.startsWith('#EXTVLCOPT:http-referrer=')) {
      pendingHeaders.push(['referer', line.split('=').slice(1).join('=')]);
    } else if (line.startsWith('#EXTVLCOPT:http-user-agent=')) {
      pendingHeaders.push(['user-agent', line.split('=').slice(1).join('=')]);
    } else if (line && !line.startsWith('#') && current) {
      current.url = line.trim();
      if (current.referrer) current.headers.referer = current.referrer;
      if (current.userAgent) current.headers['user-agent'] = current.userAgent;
      for (const [key, value] of pendingHeaders) current.headers[key] = value;
      entries.push(current);
      current = null;
    }
  }
  return entries;
}

async function downloadText(url, cacheFile, { timeout = 45000 } = {}) {
  try {
    const response = await fetch(url, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(timeout) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();
    if (!text.includes('#EXTM3U')) throw new Error('respuesta no válida');
    await fsp.writeFile(cacheFile, text);
    return { text, fromCache: false };
  } catch (error) {
    try {
      const text = await fsp.readFile(cacheFile, 'utf8');
      console.warn(`  aviso: ${url} no responde (${error.message}); uso la copia local`);
      return { text, fromCache: true };
    } catch {
      throw new Error(`No se pudo descargar ${url}: ${error.message}`);
    }
  }
}

async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return results;
}

async function probe(url, headers = {}) {
  if (!/^https?:/i.test(url) || /[\[\]{}]/.test(url)) return { ok: false, reason: 'URL de plantilla' };
  try {
    const response = await fetch(url, {
      headers: { 'user-agent': UA, accept: '*/*', 'accept-language': 'es-ES,es;q=0.9', ...headers },
      redirect: 'follow',
      signal: AbortSignal.timeout(20000)
    });
    if (!response.ok) return { ok: false, reason: `HTTP ${response.status}` };
    const text = await response.text();
    if (!text.trimStart().startsWith('#EXTM3U')) return { ok: false, reason: 'no es HLS' };
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: error.name === 'TimeoutError' ? 'timeout' : error.message };
  }
}

function normalizeName(value) {
  return value
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, ' ')
    .replace(/\b(hd|sd|uhd|1080p|720p|576p|4k)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function slugify(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-');
}

function initials(name) {
  const words = name.replace(/[^\p{L}\p{N} ]/gu, ' ').split(/\s+/).filter(Boolean);
  if (!words.length) return 'TV';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function hueFor(value) {
  let hash = 0;
  for (const char of value) hash = (hash * 31 + char.charCodeAt(0)) % 360;
  return hash;
}

function fallbackSvg(name) {
  const label = initials(name);
  const hue = hueFor(name);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="hsl(${hue} 55% 30%)"/>
    <stop offset="1" stop-color="hsl(${(hue + 40) % 360} 60% 16%)"/>
  </linearGradient></defs>
  <rect width="120" height="120" rx="26" fill="url(#g)"/>
  <text x="60" y="72" text-anchor="middle" font-family="Segoe UI, Roboto, Arial, sans-serif" font-size="${label.length > 2 ? 34 : 44}" font-weight="700" fill="#ffffff">${label}</text>
</svg>`;
}

function extensionFor(contentType, url) {
  if (/svg/i.test(contentType)) return '.svg';
  if (/avif/i.test(contentType)) return '.avif';
  if (/png/i.test(contentType)) return '.png';
  if (/jpe?g/i.test(contentType)) return '.jpg';
  if (/webp/i.test(contentType)) return '.webp';
  if (/gif/i.test(contentType)) return '.gif';
  const match = url.toLowerCase().match(/\.(svg|avif|png|jpe?g|webp|gif)(\?|$)/);
  return match ? `.${match[1]}` : '.png';
}

async function downloadLogo(url, baseName, attempt = 0) {
  try {
    const response = await fetch(url, {
      headers: { 'user-agent': UA, accept: 'image/*' },
      redirect: 'follow',
      signal: AbortSignal.timeout(20000)
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const type = response.headers.get('content-type') || '';
    if (!/image\//i.test(type)) throw new Error(`tipo ${type}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length < 300) throw new Error('imagen vacía');
    const file = baseName + extensionFor(type, url);
    await fsp.writeFile(path.join(LOGO_DIR, file), buffer);
    return `/logos/${file}`;
  } catch (error) {
    if (attempt < 1) {
      await new Promise((resolve) => setTimeout(resolve, 900));
      return downloadLogo(url, baseName, attempt + 1);
    }
    return null;
  }
}

async function main() {
  await fsp.mkdir(CACHE_DIR, { recursive: true });
  await fsp.mkdir(DATA_DIR, { recursive: true });
  await fsp.rm(LOGO_DIR, { recursive: true, force: true });
  await fsp.mkdir(LOGO_DIR, { recursive: true });

  console.log('Descargando listas de canales…');
  const [tdt, iptv] = await Promise.all([
    downloadText(TDT_URL, path.join(CACHE_DIR, 'tdt.m3u8')),
    downloadText(IPTV_ES_URL, path.join(CACHE_DIR, 'iptv-es.m3u'))
  ]);

  const tdtEntries = parsePlaylist(tdt.text);
  const iptvEntries = parsePlaylist(iptv.text);
  const byId = new Map();
  for (const entry of tdtEntries) {
    if (!entry.id) continue;
    if (!byId.has(entry.id)) byId.set(entry.id, { ...entry, urls: [entry.url], headers: entry.headers });
    else byId.get(entry.id).urls.push(entry.url);
  }

  const chosen = SELECTION.map((id) => byId.get(id)).filter(Boolean);
  const missing = SELECTION.filter((id) => !byId.has(id));
  if (missing.length) console.warn('  aviso: no están en la lista:', missing.join(', '));

  const byName = new Map();
  for (const entry of tdtEntries) {
    if (!entry.name) continue;
    if (!byName.has(entry.name)) byName.set(entry.name, []);
    byName.get(entry.name).push(entry);
  }

  const missingNames = [];
  for (const [id, name] of NAME_SELECTION) {
    const entries = byName.get(name);
    if (!entries?.length) {
      missingNames.push(name);
      continue;
    }
    if (chosen.some((channel) => channel.id === id || normalizeName(channel.name) === normalizeName(name))) continue;
    const first = entries[0];
    chosen.push({
      ...first,
      id,
      name: first.name,
      urls: [...new Set(entries.map((entry) => entry.url))],
      headers: { ...(first.headers || {}) }
    });
  }
  if (missingNames.length) console.warn('  aviso: canales sin tvg-id no encontrados:', missingNames.join(', '));

  for (const extra of EXTRA_CHANNELS) {
    if (!chosen.some((channel) => channel.id === extra.id || normalizeName(channel.name) === normalizeName(extra.name))) {
      chosen.push({ ...extra, urls: [...extra.urls], headers: { ...(extra.headers || {}) } });
    }
  }
  for (const [id, urls] of Object.entries(EXTRA_URLS)) {
    const channel = chosen.find((item) => item.id === id);
    if (channel) {
      channel.urls.push(...urls);
      const extra = EXTRA_CHANNELS.find((item) => item.id === id);
      if (extra?.headers) Object.assign(channel.headers, extra.headers);
    }
  }
  for (const channel of chosen) channel.urls = [...new Set(channel.urls)];

  console.log(`Comprobando ${chosen.length} canales (${chosen.reduce((total, c) => total + c.urls.length, 0)} señales)…`);
  const probes = await mapLimit(chosen, 8, async (channel) => {
    const results = [];
    for (const url of channel.urls) {
      const result = await probe(url, channel.headers);
      if (result.ok) results.push(url);
      if (results.length >= 3) break;
    }
    return { channel, working: results };
  });

  const available = probes.filter((item) => item.working.length > 0);
  const unavailable = probes.filter((item) => item.working.length === 0);
  if (unavailable.length) {
    console.warn('  aviso: sin señal ahora mismo:', unavailable.map((item) => item.channel.name).join(', '));
  }

  console.log('Preparando logos…');
  const iptvById = new Map(iptvEntries.map((entry) => [entry.id, entry]));
  const iptvByName = new Map();
  for (const entry of iptvEntries) {
    const key = normalizeName(entry.name);
    if (key && !iptvByName.has(key)) iptvByName.set(key, entry);
  }

  const channels = [];
  for (const { channel, working } of available) {
    const baseName = slugify(channel.id);
    let logo = null;
    const overrideId = Object.prototype.hasOwnProperty.call(LOGO_ID_OVERRIDES, channel.id)
      ? LOGO_ID_OVERRIDES[channel.id]
      : undefined;
    const logoEntry = overrideId ? iptvById.get(overrideId) : iptvByName.get(normalizeName(channel.name));
    if (logoEntry?.logo) logo = await downloadLogo(logoEntry.logo, baseName);
    if (!logo && /^https?:/i.test(channel.logo || '')) logo = await downloadLogo(channel.logo, baseName);
    if (!logo) {
      await fsp.writeFile(path.join(LOGO_DIR, `${baseName}.svg`), fallbackSvg(channel.name), 'utf8');
      logo = `/logos/${baseName}.svg`;
    }

    channels.push({
      id: channel.id,
      name: channel.name,
      group: GROUP_ALIASES[channel.group] || channel.group || 'Otros',
      logo,
      urls: working,
      ...(Object.keys(channel.headers).length ? { headers: channel.headers } : {})
    });
  }

  for (const dynamic of DYNAMIC_CHANNELS) {
    if (channels.some((channel) => channel.id === dynamic.id)) continue;
    const baseName = slugify(dynamic.id);
    let logo = dynamic.logoUrl ? await downloadLogo(dynamic.logoUrl, baseName) : null;
    if (!logo) {
      await fsp.writeFile(path.join(LOGO_DIR, `${baseName}.svg`), fallbackSvg(dynamic.name), 'utf8');
      logo = `/logos/${baseName}.svg`;
    }
    channels.push({
      id: dynamic.id,
      name: dynamic.name,
      group: dynamic.group,
      logo,
      urls: [],
      resolver: dynamic.resolver,
      ...(dynamic.headers ? { headers: dynamic.headers } : {})
    });
  }

  console.log(`Añadidos ${DYNAMIC_CHANNELS.length} canales con resolución dinámica (Atresplayer/Brightcove).`);

  for (const external of EXTERNAL_CHANNELS) {
    const baseName = slugify(external.id);
    let logo = external.logoUrl ? await downloadLogo(external.logoUrl, baseName) : null;
    if (!logo) {
      await fsp.writeFile(path.join(LOGO_DIR, `${baseName}.svg`), fallbackSvg(external.name), 'utf8');
      logo = `/logos/${baseName}.svg`;
    }
    channels.push({
      id: external.id,
      name: external.name,
      group: external.group,
      logo,
      urls: [],
      externalUrl: external.externalUrl
    });
  }

  console.log(`Añadidos ${EXTERNAL_CHANNELS.length} accesos oficiales a Mediaset Infinity.`);

  channels.sort((a, b) => {
    const rank = (group) => (GROUP_ORDER.includes(group) ? GROUP_ORDER.indexOf(group) : 999);
    const groupDiff = rank(a.group) - rank(b.group);
    return groupDiff || a.name.localeCompare(b.name, 'es');
  });

  const groups = [...new Set(channels.map((channel) => channel.group))];
  const defaults = DEFAULT_IDS.filter((id) => channels.some((channel) => channel.id === id));
  const output = {
    updatedAt: new Date().toISOString(),
    source: 'TDTChannels — https://www.tdtchannels.com/ (señales); iptv-org (logos); Mediaset Infinity (accesos oficiales)',
    groups,
    defaults,
    channels
  };

  await fsp.writeFile(path.join(DATA_DIR, 'channels.json'), JSON.stringify(output, null, 2), 'utf8');

  console.log('');
  console.log(`Listo: ${channels.length} canales (${available.length} comprobados + ${channels.length - available.length} con resolución dinámica o acceso oficial).`);
  console.log(`Catálogo: ${path.relative(ROOT, path.join(DATA_DIR, 'channels.json'))}`);
  console.log(`Logos: ${path.relative(ROOT, LOGO_DIR)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
