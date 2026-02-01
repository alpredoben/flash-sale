import encryptionUtil from './shared/utils/encryption.util';

const testCompare = async () => {
  const isPasswordValid = await encryptionUtil.comparePassword(
    'password123',
    '$2b$10$HZc2QPoatG2/ag.3pQj.tOVmQjVhpgE70g1LX2zFdlhwCDIEJJlRy'
  );

  console.log({ resultIsPassword: isPasswordValid });
};

testCompare();
