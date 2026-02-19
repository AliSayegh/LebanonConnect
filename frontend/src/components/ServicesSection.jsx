import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const services = [
  { name: "Electrician", slug: "electrician", icon: "/services-icons/electrician" },
  { name: "Plumber", slug: "plumber", icon: "/services-icons/plumber" },
  { name: "Carpenter", slug: "carpenter", icon: "/services-icons/carpenter" },
  { name: "Painter", slug: "painter", icon: "/services-icons/painter" },
  { name: "HVAC Tech", slug: "air-conditioner", icon: "/services-icons/hvac" },
  { name: "Cleaning", slug: "cleaning", icon: "/services-icons/cleaning" },
  { name: "Appliance", slug: "appliance", icon: "/services-icons/appliance" },
  { name: "IT Support", slug: "it-support", icon: "/services-icons/it-support" },
];

export default function ServicesSection() {
  return (
    <section className="services-section">
      <div className="section-header">
        <div className="miniBadge" style={{ marginBottom: '12px' }}>Explore Categories</div>
        <h2 className="section-title">Common <span>Services</span></h2>
        <p className="section-subtitle">Find trusted experts for your everyday home needs in Lebanon</p>
      </div>
      
      <div className="services-grid">
        {services.map((service, idx) => (
          <motion.div
            key={service.slug}
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.05 }}
          >
            <Link to={`/services/${service.slug}`} className="service-card-link">
              <div className="service-card">
                <div className="service-icon-wrapper">
                  <img src={service.icon} alt={service.name} className="service-icon" />
                </div>
                <span className="service-name">{service.name}</span>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
