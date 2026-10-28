import { TicketCategory, TicketPriority } from './types';

export const CANNED_RESPONSES: string[] = [
  'Bilgisayarınızı yeniden başlatmayı denediniz mi?',
  'Sorunu inceliyoruz, en kısa sürede dönüş yapacağız.',
  'Lütfen bir ekran görüntüsü ekleyebilir misiniz?',
  'Talebiniz çözüldü, herhangi bir sorun olursa tekrar yazabilirsiniz.',
  'Bu konu için sizi yerinde ziyaret etmemiz gerekiyor, uygun bir saat belirtir misiniz?',
];

export interface TicketTemplate {
  label: string;
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
}

export const TICKET_TEMPLATES: TicketTemplate[] = [
  {
    label: 'Şifre sıfırlama',
    title: 'Şifremi hatırlamıyorum / sıfırlanması gerekiyor',
    description: 'Hesabıma giriş yapamıyorum, şifremin sıfırlanmasını rica ediyorum.',
    category: 'Access',
    priority: 'Medium',
  },
  {
    label: 'Yazıcı sorunu',
    title: 'Yazıcı çalışmıyor',
    description: 'Katımdaki yazıcı çıktı almıyor / kağıt sıkışması veriyor.',
    category: 'Printer',
    priority: 'Low',
  },
  {
    label: 'Yeni ekipman talebi',
    title: 'Yeni ekipman talebi',
    description: 'İş için ek bir ekipmana (monitör, klavye, mouse vb.) ihtiyacım var.',
    category: 'Hardware',
    priority: 'Low',
  },
  {
    label: 'Yazılım kurulumu',
    title: 'Yazılım kurulum talebi',
    description: 'Bilgisayarıma şu yazılımın kurulmasını rica ediyorum: ',
    category: 'Software',
    priority: 'Medium',
  },
  {
    label: 'İnternet/Ağ sorunu',
    title: 'İnternet bağlantı sorunu',
    description: 'İnternet/ağ bağlantım kesik veya çok yavaş.',
    category: 'Network',
    priority: 'High',
  },
];

export interface FaqItem {
  question: string;
  answer: string;
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'Şifremi unuttum, ne yapmalıyım?',
    answer:
      'Giriş ekranındaki "Şifremi Unuttum" bağlantısını kullanabilir, ya da bir destek talebi açarak Bilgi İşlem ekibinden şifre sıfırlama talebinde bulunabilirsiniz. Şirket bilgisayarınız domain\'e bağlıysa çoğu zaman hiç şifre girmeden Windows kimliğinizle otomatik giriş yapabilirsiniz.',
  },
  {
    question: 'Talebimin durumunu nasıl takip ederim?',
    answer:
      '"Taleplerim" sayfasında açtığınız tüm talepleri ve güncel durumlarını görebilirsiniz. Durum değiştiğinde ayrıca bildirim de alırsınız.',
  },
  {
    question: 'Talebim "Çözüldü" oldu ama sorun devam ediyor, ne yapmalıyım?',
    answer:
      'Talebi kapatmadan (Onayla ve Kapat demeden) önce, talebe yorum ekleyerek sorunun devam ettiğini belirtebilirsiniz. Bilgi İşlem ekibi bunu görüp tekrar inceleyecektir.',
  },
  {
    question: 'Yazıcı sorunlarını kendim çözebilir miyim?',
    answer:
      'Sık karşılaşılan yazıcı sorunları için: 1) Yazıcıyı kapatıp açın. 2) Kağıt sıkışmasını kontrol edin. 3) Bilgisayarınızı yeniden başlatın. Sorun devam ederse "Yazıcı sorunu" şablonuyla bir talep açabilirsiniz.',
  },
  {
    question: 'VPN bağlantım sürekli kopuyor, ne yapmalıyım?',
    answer:
      'Öncelikle internet bağlantınızın stabil olduğundan emin olun. Sorun devam ederse "İnternet/Ağ sorunu" kategorisiyle bir talep açın, VPN istemci sürüm bilginizi de talebe not olarak ekleyin.',
  },
  {
    question: 'Yeni bir yazılımın kurulmasını nasıl talep ederim?',
    answer:
      '"Yeni Talep" ekranında "Yazılım kurulumu" şablonunu seçip hangi yazılıma ihtiyacınız olduğunu açıklama kısmına yazmanız yeterli. Lisans gerektiren yazılımlarda onay süreci biraz daha uzun sürebilir.',
  },
];
